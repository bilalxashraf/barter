import type { ChainRegistry } from "@barter/chains";
import type {
  CapabilityHandler,
  ChainDriver,
  ChannelReply,
  CustodyMode,
  PaymentIntentDraft,
  PolicyReason,
  SocialCommand,
  SocialRecipient
} from "@barter/contracts";
import {
  channelReplySchema,
  paymentIntentDraftSchema,
  policyVerdictSchema,
  socialRecipientSchema
} from "@barter/contracts";
import { reasonToReply, parseCanonicalCommand } from "@barter/social";

export type RecipientResolution = {
  accountId?: string;
  address: string;
  recipient: SocialRecipient;
};

export type PreviewDependencies = {
  chainRegistry: ChainRegistry;
  targetHandle?: string;
  mode?: CustodyMode;
  payerAccountId?: string;
  payerWalletId?: string;
  recipientResolver: (input: {
    handle: string;
    chainName: string;
  }) => Promise<RecipientResolution | null>;
  tokenAllowlistResolver: (input: {
    chainName: string;
    symbol: string;
  }) => Promise<{
    tokenAddress?: string;
    decimals?: number;
  } | null>;
};

export type PreviewOutcome = {
  preview: PaymentIntentDraft;
  helpText?: string;
};

export type TransferCapabilityInput = {
  command: SocialCommand;
  chainDriver: ChainDriver;
  mode: CustodyMode;
  senderAccountId?: string;
  senderWalletId?: string;
  recipient: SocialRecipient;
  tokenAddress?: string;
  decimals?: number;
};

export class TransferCapabilityHandler implements CapabilityHandler<TransferCapabilityInput> {
  readonly capability = "transfer";

  async buildPlan(input: TransferCapabilityInput) {
    const planInput = {
      mode: input.mode,
      assetSymbol: input.command.tokenSymbol,
      amountInput: input.command.amountInput,
      recipient: input.recipient,
      metadata: {
        command: input.command.normalizedText
      }
    } as const;

    return input.chainDriver.buildTransferPlan({
      ...planInput,
      ...(input.senderAccountId ? { senderAccountId: input.senderAccountId } : {}),
      ...(input.senderWalletId ? { senderWalletId: input.senderWalletId } : {}),
      ...(input.tokenAddress ? { tokenAddress: input.tokenAddress } : {}),
      ...(typeof input.decimals === "number" ? { decimals: input.decimals } : {})
    });
  }
}

export async function buildPaymentIntentPreview(
  text: string,
  dependencies: PreviewDependencies
): Promise<PreviewOutcome> {
  const targetHandle = dependencies.targetHandle ?? "@barterpayments";
  const command = parseCanonicalCommand(text, targetHandle);

  if (!command) {
    return {
      preview: paymentIntentDraftSchema.parse({
        chainFamily: "other",
        chainName: "unknown",
        assetSymbol: "UNKNOWN",
        amountInput: "0",
        policyVerdict: {
          allowed: false,
          reasons: [
            {
              code: "syntax_invalid",
              message: `Use: ${targetHandle} pay <amount> <token> to <@handle|address> on <chain>`
            }
          ]
        }
      }),
      helpText: `Use: ${targetHandle} pay <amount> <token> to <@handle|address> on <chain>`
    };
  }

  const chainDriver = dependencies.chainRegistry.get(command.chainName);
  if (!chainDriver) {
    return rejectedPreview(command, {
      code: "unsupported_chain",
      message: `Unsupported chain "${command.chainName}".`
    });
  }

  const allowlistEntry = await dependencies.tokenAllowlistResolver({
    chainName: command.chainName,
    symbol: command.tokenSymbol
  });

  if (!allowlistEntry) {
    return rejectedPreview(command, {
      code: "token_not_allowed",
      message: `${command.tokenSymbol} is not allowlisted on ${command.chainName}.`
    });
  }

  const resolvedRecipient = await resolveRecipient(command.recipient, chainDriver, dependencies);
  if (!resolvedRecipient.ok) {
    return rejectedPreview(command, resolvedRecipient.reason);
  }

  const handler = new TransferCapabilityHandler();
  const transferInput: TransferCapabilityInput = {
    command,
    chainDriver,
    mode: dependencies.mode ?? "mock",
    recipient: resolvedRecipient.recipient,
    ...(dependencies.payerAccountId ? { senderAccountId: dependencies.payerAccountId } : {}),
    ...(dependencies.payerWalletId ? { senderWalletId: dependencies.payerWalletId } : {}),
    ...(allowlistEntry.tokenAddress ? { tokenAddress: allowlistEntry.tokenAddress } : {}),
    ...(typeof allowlistEntry.decimals === "number" ? { decimals: allowlistEntry.decimals } : {})
  };
  const executionPlan = await handler.buildPlan(transferInput);

  const replyPayload = buildAcceptedReply(command, resolvedRecipient.recipient);
  const requestedRecipientAddress =
    command.recipient.kind === "address"
      ? command.recipient.address
      : resolvedRecipient.recipient.kind === "address"
        ? resolvedRecipient.recipient.address
        : undefined;
  const previewInput = {
    command,
    chainFamily: chainDriver.descriptor.family,
    chainName: command.chainName,
    assetSymbol: command.tokenSymbol,
    amountInput: command.amountInput,
    policyVerdict: policyVerdictSchema.parse({
      allowed: true,
      reasons: []
    }),
    executionPlan,
    replyPayload
  } as const;
  const preview = paymentIntentDraftSchema.parse({
    ...previewInput,
    ...(dependencies.payerAccountId ? { payerAccountId: dependencies.payerAccountId } : {}),
    ...(resolvedRecipient.accountId ? { recipientAccountId: resolvedRecipient.accountId } : {}),
    ...(command.recipient.kind === "handle"
      ? { requestedRecipientHandle: command.recipient.handle }
      : {}),
    ...(requestedRecipientAddress ? { requestedRecipientAddress } : {})
  });

  return {
    preview
  };
}

export function buildReplyForExecution(
  preview: PaymentIntentDraft,
  txHash: string,
  targetEventId: string
): ChannelReply {
  const recipient =
    preview.executionPlan?.recipient.kind === "handle"
      ? preview.executionPlan.recipient.handle
      : preview.executionPlan?.recipient.address ?? "recipient";

  return channelReplySchema.parse({
    channel: "x",
    targetEventId,
    text: `Paid ${preview.amountInput} ${preview.assetSymbol} on ${preview.chainName} to ${recipient}. Tx: ${txHash}`,
    metadata: {
      outcome: "success"
    }
  });
}

export function buildReplyForRejectedPreview(preview: PaymentIntentDraft, targetEventId: string): ChannelReply {
  const reason = preview.policyVerdict.reasons[0];

  return channelReplySchema.parse({
    channel: "x",
    targetEventId,
    text: reason ? reasonToReply(reason) : "Request rejected.",
    metadata: {
      outcome: "rejected"
    }
  });
}

async function resolveRecipient(
  recipient: SocialRecipient,
  chainDriver: ChainDriver,
  dependencies: PreviewDependencies
): Promise<
  | { ok: true; accountId?: string; recipient: SocialRecipient }
  | { ok: false; reason: PolicyReason }
> {
  if (recipient.kind === "handle") {
    const resolved = await dependencies.recipientResolver({
      handle: recipient.handle,
      chainName: chainDriver.descriptor.name
    });

    if (!resolved) {
      return {
        ok: false,
        reason: {
          code: "recipient_not_found",
          message: `${recipient.handle} has not linked a payout destination for ${chainDriver.descriptor.name}.`
        }
      };
    }

    const resolvedRecipientPayload = {
      ok: true,
      recipient: socialRecipientSchema.parse({
        kind: "address",
        address: resolved.address
      })
    } as const;

    return resolved.accountId
      ? {
          ...resolvedRecipientPayload,
          accountId: resolved.accountId
        }
      : resolvedRecipientPayload;
  }

  const validation = chainDriver.validateAddress(recipient.address);
  if (!validation.ok || !validation.normalizedAddress) {
    return {
      ok: false,
      reason: {
        code: "invalid_address",
        message: validation.reason ?? `Invalid recipient address for ${chainDriver.descriptor.name}.`
      }
    };
  }

  return {
    ok: true,
    recipient: socialRecipientSchema.parse({
      kind: "address",
      address: validation.normalizedAddress
    })
  };
}

function buildAcceptedReply(command: SocialCommand, recipient: SocialRecipient): ChannelReply {
  const recipientLabel = recipient.kind === "handle" ? recipient.handle : recipient.address;

  return channelReplySchema.parse({
    channel: "x",
    targetEventId: "pending",
    text: `Queued payment of ${command.amountInput} ${command.tokenSymbol} on ${command.chainName} to ${recipientLabel}.`,
    metadata: {
      outcome: "accepted"
    }
  });
}

function rejectedPreview(command: SocialCommand, reason: PolicyReason): PreviewOutcome {
  return {
    preview: paymentIntentDraftSchema.parse({
      requestedRecipientHandle: command.recipient.kind === "handle" ? command.recipient.handle : undefined,
      requestedRecipientAddress: command.recipient.kind === "address" ? command.recipient.address : undefined,
      command,
      chainFamily: "other",
      chainName: command.chainName,
      assetSymbol: command.tokenSymbol,
      amountInput: command.amountInput,
      policyVerdict: {
        allowed: false,
        reasons: [reason]
      }
    }),
    helpText: reasonToReply(reason)
  };
}
