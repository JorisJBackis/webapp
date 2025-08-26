# Branch Protection

## Current Setup (Simplified)

### Main Branch Protection
- **No direct pushes** - All changes require PR
- **No approval required** - Can merge own PRs for speed
- **Admins included** - Even repo owner must use PRs
- **No force pushes** - History is protected

## Why This Setup?

**Speed + Safety Balance**:
- Fast iteration (no waiting for reviews)
- Audit trail (everything in PRs)  
- Rollback capability (clean history)
- Can't accidentally break production

## Workflow

1. Create feature branch
2. Make changes
3. Create PR
4. Immediately merge (no waiting!)
5. Changes tracked in PR history

## Who Can Do What

- **Create PRs**: Everyone (including AI assistants)
- **Merge PRs**: Anyone with write access
- **Direct push to main**: NOBODY (blocked for all)

## Testing Protection

```bash
# This will fail (protection working!)
git push origin main

# Error: protected branch hook declined
```

## Modifying Protection

If you need to change rules:

```bash
# Check current protection
gh api repos/JorisJBackis/webapp/branches/main/protection

# Temporarily disable (NOT recommended)
# Go to: Settings → Branches → Edit main protection
```

## Best Practices

- Always use PRs (even for typos)
- Keep PR titles descriptive
- Reference issues when applicable
- Don't disable protection "just this once"

Protection is simple by design - one rule that everyone follows!