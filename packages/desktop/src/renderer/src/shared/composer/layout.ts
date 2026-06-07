interface ComposerLayeredInput {
  multiline: boolean;
  singleLine: boolean;
  hasAttachments: boolean;
}

export const composerIsLayered = ({ multiline, singleLine, hasAttachments }: ComposerLayeredInput) =>
  !singleLine && (hasAttachments || multiline);
