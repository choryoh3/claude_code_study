import { describe, expect, it } from 'vitest';
import { checkCommand } from './guard-bash.mjs';

describe('guard-bash', () => {
  it('通常のコマンドは許可する', () => {
    expect(checkCommand('pnpm test')).toBeNull();
    expect(checkCommand('git status')).toBeNull();
    expect(checkCommand('git push origin feature/x')).toBeNull();
  });

  it('rm -rf をブロックする', () => {
    expect(checkCommand('rm -rf node_modules')).not.toBeNull();
    expect(checkCommand('rm -fr dist')).not.toBeNull();
  });

  it('force push をブロックする', () => {
    expect(checkCommand('git push --force origin main')).not.toBeNull();
    expect(checkCommand('git push -f')).not.toBeNull();
  });

  it('.env の git add をブロックし、.env.example は許可する', () => {
    expect(checkCommand('git add .env')).not.toBeNull();
    expect(checkCommand('git add .env.local')).not.toBeNull();
    expect(checkCommand('git add .env.example')).toBeNull();
  });

  it('.env がステージされた状態の commit をブロックする', () => {
    expect(checkCommand('git commit -m "x"', ['apps/web/.env.local'])).not.toBeNull();
    expect(checkCommand('git commit -m "x"', ['.env.example', 'README.md'])).toBeNull();
  });
});
