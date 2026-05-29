import re

html = open('d:/SOP/assisthealth-sop/admin.html', 'r', encoding='utf-8').read()
for match in re.finditer(r'id="([^"]+)"', html):
    print(match.group(1))
