# Branch Protection & Permissions

## Protection Rules

### Main Branch Protection
- **NO direct pushes** - Everything goes through Pull Requests
- **Required approvals**: 1 (from authorized reviewers)
- **Required status checks**: Tests must pass
- **No force pushes** - Prevents history rewriting
- **Administrators included** - Even owners must follow rules

## Who Can Do What

### Pull Requests (PRs)
✅ **Everyone can create PRs**:
- Claude Code (AI)
- Joris (Owner)
- Nadjib (Collaborator)
- Any contributor

### PR Approvals (Merge to Main)
✅ **Only humans can approve**:
- Joris (Owner) - Can approve any PR
- Nadjib (Collaborator) - Can approve any PR
- ❌ Claude cannot approve PRs (safety feature)

### Why This Setup

1. **AI Safety**: Claude can help code but cannot deploy without human review
2. **Peer Review**: Either Joris or Nadjib can review and deploy
3. **Accident Prevention**: No accidental pushes to main
4. **Audit Trail**: Every change tracked through PRs

## Workflow Example

```bash
# Claude or anyone creates feature
git checkout -b feature/new-feature
git add .
git commit -m "feat: add new feature"
git push origin feature/new-feature

# Create PR on GitHub
# Joris or Nadjib reviews
# If approved → Merges to main
# GitHub Actions → Deploys to production
```

## Emergency Override

If you absolutely need to bypass (NOT recommended):
1. Go to Settings → Branches
2. Temporarily disable "Include administrators"
3. Make your change
4. RE-ENABLE immediately after

## Commands for Collaborators

```bash
# Nadjib cloning the repo
git clone https://github.com/JorisJBackis/webapp.git

# Creating a feature branch
git checkout -b feature/nadjib-feature

# Pushing changes
git push origin feature/nadjib-feature

# Then create PR on GitHub
```