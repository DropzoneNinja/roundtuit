Run this from the frontend/ directory:


npm version patch -m 'message'  # 0.6.0 → 0.6.1
npm version minor -m 'message'  # 0.6.0 → 0.7.0
npm version major -m 'message'  # 0.6.0 → 1.0.0
It updates package.json and creates a git commit + tag automatically. If you don't want the commit/tag, add --no-git-tag-version.

