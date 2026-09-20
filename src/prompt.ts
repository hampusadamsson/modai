/**
 * Builds the single prompt sent to the selected provider: the instructions
 * (a role or a custom instruction) followed by the text to operate on.
 */
export function buildPrompt(instructions: string, text: string): string {
	return `${instructions}
			### INPUT TEXT
			${text}`;
}
