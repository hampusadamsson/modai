import { vi } from "vitest";
import type { RequestUrlParam } from "obsidian";
import { requestUrl } from "obsidian";

type RequestUrlResponse = Awaited<ReturnType<typeof requestUrl>>;

/** The mocked `requestUrl` that all providers call. */
export const requestUrlMock = vi.mocked(requestUrl);

/** Resolves the next `requestUrl` call with the fields a provider reads. */
export function respondWith(response: {
	json?: unknown;
	text?: string;
	status?: number;
}): void {
	requestUrlMock.mockResolvedValue(response as unknown as RequestUrlResponse);
}

/**
 * Runs `effect` before answering, which lets a test change the settings while
 * a request is in flight.
 */
export function respondWithAfter(
	effect: () => void,
	response: { json?: unknown; text?: string; status?: number },
): void {
	// The real call returns a promise decorated with `json`, `text` and
	// `arrayBuffer`; providers only await it and read the fields.
	requestUrlMock.mockImplementationOnce(() => {
		effect();

		return response as unknown as ReturnType<typeof requestUrl>;
	});
}

/** Returns the request handed to `requestUrl` in the most recent call. */
export function lastRequest(): RequestUrlParam {
	const calls = requestUrlMock.mock.calls;
	const call = calls[calls.length - 1];
	if (!call) {
		throw new Error("requestUrl was not called");
	}

	const request = call[0];
	if (typeof request === "string") {
		throw new Error("expected a RequestUrlParam, got a string URL");
	}

	return request;
}

/** Parses the JSON body of a recorded request. */
export function sentBody(request: RequestUrlParam): unknown {
	return JSON.parse(request.body as string) as unknown;
}
