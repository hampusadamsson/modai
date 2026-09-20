import { normalizePath } from "obsidian";
import { AnnotationType } from "workshop/annotations";

export interface Role {
	/** File name of the role file, without its `.md` extension. */
	name: string;
	/** Instructions sent to the model: the file body without frontmatter. */
	instructions: string;
	/** Whether the role rewrites the text or comments on it. */
	mode: AnnotationType;
	/** Vault path of the file this role was read from. */
	path: string;
}

/** The part of `Vault` that roles are read from, so tests need no vault. */
export interface VaultLike {
	getMarkdownFiles(): { path: string }[];
	cachedRead(file: { path: string }): Promise<string>;
}

/** Role name of a role file: its file name without the extension. */
export function roleNameFromPath(path: string): string {
	const name = path.slice(path.lastIndexOf("/") + 1);

	return name.replace(/\.md$/i, "").trim();
}

/** Removes a leading YAML frontmatter block from the role file. */
export function stripFrontmatter(content: string): string {
	return content.replace(/^\uFEFF?---\r?\n[\s\S]*?\r?\n---[ \t]*\r?\n?/, "");
}

/** The frontmatter block of a role file, or `""` when it has none. */
export function frontmatterOf(content: string): string {
	return (
		/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/.exec(content)?.[1] ??
		""
	);
}

/**
 * Mode declared in the role file, `mode: edit` or `mode: feedback`. Roles that
 * do not say what they do are treated as edit roles.
 */
export function modeOf(content: string): AnnotationType {
	const mode = /^\s*mode\s*:\s*["']?([a-z]+)["']?\s*$/im.exec(
		frontmatterOf(content),
	)?.[1];

	return mode?.toLowerCase() === "feedback" ? "feedback" : "edit";
}

/** Folder path without surrounding slashes, or `""` when unset. */
export function normalizeFolder(folder: string): string {
	const trimmed = folder.trim().replace(/^\/+|\/+$/g, "");

	return trimmed === "" ? "" : normalizePath(trimmed);
}

/** Whether `path` is a markdown file inside `folder`, subfolders included. */
export function isInRolesFolder(path: string, folder: string): boolean {
	const prefix = normalizeFolder(folder);

	return prefix !== "" && path.startsWith(`${prefix}/`);
}

/** Command id for a role, derived from its name. */
export function roleCommandId(name: string): string {
	const slug = name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");

	return `modai-role-${slug === "" ? "unnamed" : slug}`;
}

/**
 * Reads every markdown file in the roles folder as a role. Subfolders are
 * included; the first file wins when two of them share a name. Files without
 * instructions are ignored.
 */
export async function loadRoles(
	vault: VaultLike,
	folder: string,
): Promise<Role[]> {
	if (normalizeFolder(folder) === "") return [];

	const files = vault
		.getMarkdownFiles()
		.filter((file) => isInRolesFolder(file.path, folder))
		.sort((a, b) => a.path.localeCompare(b.path));

	const roles: Role[] = [];
	const seen = new Set<string>();

	for (const file of files) {
		const name = roleNameFromPath(file.path);
		if (name === "" || seen.has(name)) continue;

		const content = await vault.cachedRead(file);
		const instructions = stripFrontmatter(content).trim();
		if (instructions === "") continue;

		seen.add(name);
		roles.push({
			name,
			instructions,
			mode: modeOf(content),
			path: file.path,
		});
	}

	return roles;
}
