/**
 * IapCard - the canonical IAP (Intent Approval Prompt) review card.
 *
 * One source of truth for how an IAP is rendered to a human reviewer.
 * Used by:
 *   - features/intent-plans/components/IAPDetailBody (dashboard detail + peek)
 *   - features/onboarding/components/Step4LiveMoment (onboarding live moment)
 *
 * Visual contract:
 *   - bg-aq-surface, border-aq-border (1px), rounded-xl, shadow-aq-card.
 *   - No dark-ink header strip; no double border.
 *   - Top section: agent BrandIcon + agent name + "wants to call" + tool +
 *     "on" + MCP chip. Risk pill + trust score on the right.
 *   - Middle: arguments grid (2 cols, key/value, both mono, divide-y).
 *   - Policy verdict line: IconShieldCheck + "Allowed under policy" + note.
 *   - Action row: when pending, Reject (secondary) + Approve (primary).
 *     When decided, a subtle single-line ledger entry.
 */
import type { ReactElement } from 'react';
import { BrandIcon } from '@shared/ui/BrandIcon';
import { Button } from '@shared/ui/Button';
import { Chip } from '@shared/ui/Chip';
import { IconBot, IconCheck, IconShieldCheck, IconX, type IconProps } from '@shared/icons';

export type IapRisk = 'low' | 'medium' | 'high';
export type IapVerdict = 'pending' | 'approved' | 'rejected';

export type IapArgument = {
  key: string;
  value: string;
};

export type IapShape = {
  id: string;
  agent: string;
  agentSlug?: string;
  tool: string;
  mcp: string;
  mcpSlug: string;
  risk: IapRisk;
  trustScore: number;
  arguments: ReadonlyArray<IapArgument>;
  riskNote: string;
};

export type IapCardProps = {
  iap: IapShape;
  verdict: IapVerdict;
  onApprove?: () => void;
  onReject?: () => void;
  /**
   * Optional ledger reference shown next to "Approved" / "Denied". Defaults
   * to a short slice of `iap.id`.
   */
  evidenceRef?: string;
};

const RISK_TONE: Record<IapRisk, 'good' | 'warn' | 'bad'> = {
  low: 'good',
  medium: 'warn',
  high: 'bad',
};

const RISK_LABEL: Record<IapRisk, string> = {
  low: 'Low risk',
  medium: 'Medium risk',
  high: 'High risk',
};

export function IapCard({
  iap,
  verdict,
  onApprove,
  onReject,
  evidenceRef,
}: IapCardProps): ReactElement {
  const ledger = evidenceRef ?? deriveLedger(iap.id);
  const McpChipLeading = (props: IconProps): ReactElement => (
    <BrandIcon
      slug={iap.mcpSlug}
      size={props.size ?? 10}
      fallback="MC"
      className={props.className}
    />
  );

  return (
    <section
      className="border-aq-border bg-aq-surface shadow-aq-card overflow-hidden rounded-xl border"
      aria-label="Intent Approval Prompt"
    >
      {/* ── Top: agent → tool → mcp + risk/trust ─────────────────────────── */}
      <header className="flex items-start gap-3 px-5 py-4">
        <div className="bg-aq-accent-soft text-aq-accent flex h-9 w-9 shrink-0 items-center justify-center rounded-md">
          {iap.agentSlug ? (
            <BrandIcon slug={iap.agentSlug} size={18} fallback="AG" />
          ) : (
            <IconBot size={18} stroke={1.8} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-aq-ink text-aq-md font-semibold">{iap.agent}</span>
            <span className="text-aq-ink-soft text-aq-sm">wants to call</span>
            <code className="bg-aq-zebra border-aq-border text-aq-ink text-aq-xs rounded-md border px-1.5 py-0.5 font-mono">
              {iap.tool}
            </code>
            <span className="text-aq-ink-soft text-aq-sm">on</span>
            <Chip tone="neutral" size="sm" leading={McpChipLeading}>
              {iap.mcp}
            </Chip>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Chip tone={RISK_TONE[iap.risk]} size="sm">
            {RISK_LABEL[iap.risk]}
          </Chip>
          <span className="text-aq-ink-muted text-aq-xs whitespace-nowrap">
            Trust <span className="text-aq-ink font-semibold">{iap.trustScore}</span>
          </span>
        </div>
      </header>

      {/* ── Arguments ────────────────────────────────────────────────────── */}
      <div className="border-aq-border border-t px-5 py-3">
        <div className="text-aq-ink-muted text-aq-caption tracking-aq-wider mb-2 font-semibold uppercase">
          Arguments
        </div>
        <dl className="divide-aq-border divide-y">
          {iap.arguments.map((arg) => (
            <div key={arg.key} className="grid grid-cols-[120px_1fr] gap-3 py-2">
              <dt className="text-aq-ink-muted text-aq-xs font-mono font-semibold">{arg.key}</dt>
              <dd className="text-aq-ink text-aq-xs m-0 font-mono break-words">{arg.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* ── Policy verdict line ──────────────────────────────────────────── */}
      <div className="border-aq-border text-aq-sm flex flex-wrap items-center gap-x-2 gap-y-1 border-t px-5 py-3">
        <IconShieldCheck size={14} stroke={2} className="text-aq-good shrink-0" />
        <span className="text-aq-good font-semibold">Allowed under policy.</span>
        <span className="text-aq-ink-soft">{iap.riskNote}</span>
      </div>

      {/* ── Action row ───────────────────────────────────────────────────── */}
      <div className="border-aq-border flex items-center justify-end gap-2 border-t px-5 py-3.5">
        {verdict === 'pending' ? (
          <>
            <Button variant="secondary" size="sm" leading={IconX} onClick={onReject}>
              Reject
            </Button>
            <Button variant="primary" size="sm" leading={IconCheck} onClick={onApprove}>
              Approve
            </Button>
          </>
        ) : verdict === 'approved' ? (
          <div className="text-aq-good text-aq-xs inline-flex items-center gap-1.5">
            <IconCheck size={12} stroke={2.2} />
            <span className="font-semibold">Approved</span>
            <span className="text-aq-ink-muted">{`· ${ledger}`}</span>
          </div>
        ) : (
          <div className="text-aq-bad text-aq-xs inline-flex items-center gap-1.5">
            <IconX size={12} stroke={2.2} />
            <span className="font-semibold">Denied</span>
            <span className="text-aq-ink-muted">{`· agent informed`}</span>
          </div>
        )}
      </div>
    </section>
  );
}

function deriveLedger(id: string): string {
  if (!id) return 'ev-recorded';
  const tail = id.slice(-8).toLowerCase();
  return `ev-${tail}`;
}

export default IapCard;
