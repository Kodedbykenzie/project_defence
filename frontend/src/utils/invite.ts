import type { Invite, InviteStatus } from '../types/platform';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function newInviteCode(prefix = 'ALU') {
  let s = '';
  for (let i = 0; i < 4; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return `${prefix}-${s}`;
}

export const normaliseCode = (code: string) => code.trim().toUpperCase().replace(/\s+/g, '');

export function inviteStatus(invite: Invite, now = new Date()): InviteStatus {
  if (invite.revoked) return 'revoked';
  if (invite.maxUses !== null && invite.uses >= invite.maxUses) return 'used';
  if (new Date(invite.expiresAt) < now) return 'expired';
  return 'active';
}

export const inviteLink = (code: string) => `${window.location.origin}/register?code=${encodeURIComponent(code)}`;

export const inviteMessage = (invite: Invite) =>
`You're invited to Imari, the ALU financial literacy pilot.\n\nJoin here: ${inviteLink(invite.code)}\nInvite code: ${invite.code}`;

export const usesLabel = (invite: Invite) => invite.maxUses === null ? `${invite.uses} joined` : `${invite.uses}/${invite.maxUses}`;