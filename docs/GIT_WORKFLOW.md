# Git Workflow

This repo uses a simple feature-branch workflow.

## One-time setup

```bash
git remote -v
git branch --show-current
```

## Daily sync before work

```bash
git checkout main
git pull origin main
```

## Create a feature branch

Use a clear branch name:

- `feature/landing-hero-update`
- `fix/navbar-overlap`
- `chore/readme-cleanup`

```bash
git checkout -b feature/your-change
```

## Commit your work

```bash
git status
git add -A
git commit -m "feat: short meaningful message"
```

## Push branch and open PR

```bash
git push -u origin feature/your-change
```

Then open a Pull Request from your branch to `main` on GitHub.

## Keep branch updated with main

```bash
git fetch origin
git rebase origin/main
```

If rebase is not preferred:

```bash
git merge origin/main
```

## After PR merge

```bash
git checkout main
git pull origin main
git branch -d feature/your-change
git push origin --delete feature/your-change
```

## Emergency: push directly to main

Only when necessary:

```bash
git checkout main
git pull --rebase origin main
git add -A
git commit -m "fix: urgent change"
git push origin main
```
