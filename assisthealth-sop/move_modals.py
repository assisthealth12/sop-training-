import re

filepath = 'd:/SOP/assisthealth-sop/admin.html'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# We need to find the entire block of modals we inserted and move it above the <script> tag.
# It starts with <!-- Add Navigator Modal --> and ends right before <!-- Edit User Modal -->

modals_regex = r'(<!-- Add Navigator Modal -->.*?)(?=<!-- Edit User Modal -->)'
match = re.search(modals_regex, content, re.DOTALL)

if match:
    modals_html = match.group(1)
    
    # Remove it from the current position
    content = content.replace(modals_html, '')
    
    # We want to put it right before the </main> tag, or right before the first <script> tag.
    # Let's insert it before `</main>` since that is safely above the script.
    
    if '</main>' in content:
        content = content.replace('</main>', modals_html + '\n</main>')
    else:
        # Fallback to before <script
        content = content.replace('<script', modals_html + '\n<script', 1)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Modals moved successfully.")
else:
    print("Could not find the modals block.")
