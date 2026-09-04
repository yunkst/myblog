import re

def load(p):
    return open(p, encoding='utf-8').read()

ssr_full = load('C:/Users/KFEB4/AppData/Local/Temp/ssr2.html')
m = re.search(r'<div id="root"[^>]*>(.*)</body>', ssr_full, re.S)
ssr = m.group(1)
ssr = re.sub(r'<script.*?</script>', '', ssr, flags=re.S)

cli = load('client-root2.html')
cli = re.sub(r'<script.*?</script>', '', cli, flags=re.S)

def norm(s):
    s = re.sub(r'<!--.*?-->', '', s)                      # react 分隔注释
    s = re.sub(r'\s+', ' ', s)
    s = re.sub(r'style="[^"]*"', '', s)                   # gsap 内联样式
    return s.strip()

ssr_n, cli_n = norm(ssr), norm(cli)
print('SSR len:', len(ssr_n), ' CLI len:', len(cli_n))

i = 0
while i < min(len(ssr_n), len(cli_n)) and ssr_n[i] == cli_n[i]:
    i += 1
print('first diff at', i)
print('SSR:', ssr_n[max(0, i - 120):i + 180])
print()
print('CLI:', cli_n[max(0, i - 120):i + 180])
