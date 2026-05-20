Run this from the frontend/ directory:


npm version patch   # 0.6.0 → 0.6.1
npm version minor   # 0.6.0 → 0.7.0
npm version major   # 0.6.0 → 1.0.0
It updates package.json and creates a git commit + tag automatically. If you don't want the commit/tag, add --no-git-tag-version.

