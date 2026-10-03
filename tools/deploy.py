# Deploy Silk & Steel to Netlify using the auth token stored by `netlify login`.
# Run from the project root:  python3 tools/deploy.py
import json, urllib.request, urllib.error, zipfile, os, glob, random, string, time, sys

home = os.path.expanduser('~')
cfg = json.load(open(home + '/Library/Preferences/netlify/config.json'))
uid = cfg['userId']
token = cfg['users'][uid]['auth']['token']

SITE_NAME = 'silk-and-steel'

# --- package the site (index.html at zip root) ---
zpath = '/tmp/silk-and-steel.zip'
with zipfile.ZipFile(zpath, 'w', zipfile.ZIP_DEFLATED) as z:
    z.write('index.html', 'index.html')
    for f in sorted(glob.glob('js/*.js')):
        z.write(f, f)
    z.write('README.md', 'README.md')
print('zip:', zpath, os.path.getsize(zpath), 'bytes')

def api(method, path, data=None, ctype='application/json'):
    url = 'https://api.netlify.com/api/v1' + path
    h = {'Authorization': 'Bearer ' + token, 'Content-Type': ctype}
    body = None
    if data is not None:
        body = data if isinstance(data, bytes) else json.dumps(data).encode()
    req = urllib.request.Request(url, data=body, headers=h, method=method)
    with urllib.request.urlopen(req, timeout=60) as r:
        s = r.read().decode()
        return json.loads(s) if s else {}

def rand_suffix():
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=5))

zbytes = open(zpath, 'rb').read()

# --- reuse our existing site if it exists, else create it ---
sites = api('GET', '/sites')
site = next((s for s in sites if s['name'] == SITE_NAME), None)
dep = None
if site:
    print('updating existing site:', SITE_NAME)
    dep = api('POST', f"/sites/{site['id']}/deploys", data=zbytes, ctype='application/zip')
else:
    for attempt in range(5):
        name = SITE_NAME + ('' if attempt == 0 else '-' + rand_suffix())
        try:
            # one-shot: create site + deploy the zip
            site = api('POST', '/sites?name=' + name, data=zbytes, ctype='application/zip')
            print('site created:', name)
            dep = site.get('published_deploy') or {}
            break
        except urllib.error.HTTPError as e:
            body = e.read().decode()[:300]
            print('attempt', name, '->', e.code, body)
            if e.code in (422, 400) and 'name' in body.lower():
                continue
            raise
    if site is None:
        sys.exit('could not create a site (name conflicts?)')
if not dep.get('id'):
    dep = api('POST', f"/sites/{site['id']}/deploys", data=zbytes, ctype='application/zip')

# --- poll deploy until ready ---
did = dep['id']
for _ in range(60):
    d = api('GET', f'/deploys/{did}')
    st = d.get('state')
    if st in ('ready', 'error'):
        print('deploy:', st)
        if st == 'error':
            print(json.dumps(d.get('summary_message') or d, indent=2)[:800])
            sys.exit(1)
        break
    time.sleep(2)

url = site.get('ssl_url') or site.get('url')
print('LIVE:', url)
