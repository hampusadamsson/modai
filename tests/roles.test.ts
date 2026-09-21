import { describe, expect, it } from "vitest";
import {
	frontmatterOf,
	isInRolesFolder,
	loadRoles,
	modeOf,
	normalizeFolder,
	roleCommandId,
	roleNameFromPath,
	stripFrontmatter,
} from "../src/roles";

const vault = (files: Record<string, string>) => ({
	getMarkdownFiles: () => Object.keys(files).map((path) => ({ path })),
	cachedRead: async (file: { path: string }) => files[file.path] ?? "",
});

describe("roleNameFromPath", () => {
	it("uses the file name without the extension", () => {
		expect(roleNameFromPath("Modai roles/Text editor.md")).toBe(
			"Text editor",
		);
		expect(roleNameFromPath("roles/sub/Poet.MD")).toBe("Poet");
	});
});

describe("stripFrontmatter", () => {
	it("removes a YAML block", () => {
		expect(stripFrontmatter("---\ntags: [a]\n---\nBody")).toBe("Body");
	});

	it("keeps text without frontmatter", () => {
		expect(stripFrontmatter("Body\n---\nmore")).toBe("Body\n---\nmore");
	});

	it("keeps an unterminated block", () => {
		expect(stripFrontmatter("---\ntags: [a]")).toBe("---\ntags: [a]");
	});

	it("handles a BOM and Windows line endings", () => {
		expect(stripFrontmatter("\uFEFF---\r\na: 1\r\n---\r\nBody")).toBe(
			"Body",
		);
	});
});

describe("role mode", () => {
	it("reads the mode from the role frontmatter", () => {
		expect(modeOf("---\nmode: review\n---\nComment on the text.")).toBe(
			"review",
		);
		expect(modeOf('---\nmode: "edit"\n---\nRewrite it.')).toBe("edit");
	});

	it("still understands the old name for a review role", () => {
		expect(modeOf("---\nmode: feedback\n---\nComment.")).toBe("review");
	});

	it("treats roles without a usable mode as edit roles", () => {
		expect(modeOf("Just instructions.")).toBe("edit");
		expect(modeOf("---\ntags: [writing]\n---\nRewrite it.")).toBe("edit");
		expect(modeOf("---\nmode: nonsense\n---\nRewrite it.")).toBe("edit");
	});

	it("exposes the frontmatter block", () => {
		expect(frontmatterOf("---\nmode: edit\n---\nBody")).toBe("mode: edit");
		expect(frontmatterOf("Body")).toBe("");
	});
});

describe("roles folder", () => {
	it("normalizes surrounding slashes", () => {
		expect(normalizeFolder("/Modai roles/")).toBe("Modai roles");
		expect(normalizeFolder("   ")).toBe("");
	});

	it("matches files in the folder and its subfolders", () => {
		expect(isInRolesFolder("Modai roles/Author.md", "Modai roles")).toBe(
			true,
		);
		expect(
			isInRolesFolder("Modai roles/sub/Poet.md", "/Modai roles/"),
		).toBe(true);
	});

	it("ignores siblings, the folder itself and other files", () => {
		expect(
			isInRolesFolder("Modai roles old/Author.md", "Modai roles"),
		).toBe(false);
		expect(isInRolesFolder("Modai roles", "Modai roles")).toBe(false);
		expect(isInRolesFolder("Author.md", "Modai roles")).toBe(false);
		expect(isInRolesFolder("Modai roles/Author.md", "")).toBe(false);
	});
});

describe("roleCommandId", () => {
	it("slugs the role name", () => {
		expect(roleCommandId("Text editor")).toBe("modai-role-text-editor");
		expect(roleCommandId("SEO Engineer")).toBe("modai-role-seo-engineer");
		expect(roleCommandId("!!!")).toBe("modai-role-unnamed");
	});
});

describe("loadRoles", () => {
	it("reads the markdown files of the folder, sorted by path", async () => {
		const roles = await loadRoles(
			vault({
				"Modai roles/Poet.md": "write poetry",
				"Modai roles/Author.md": "---\ntags: [x]\n---\nwrite prose",
				"Elsewhere/Author.md": "not a role",
			}),
			"Modai roles",
		);

		expect(roles).toEqual([
			{
				name: "Author",
				instructions: "write prose",
				mode: "edit",
				path: "Modai roles/Author.md",
			},
			{
				name: "Poet",
				instructions: "write poetry",
				mode: "edit",
				path: "Modai roles/Poet.md",
			},
		]);
	});

	it("includes subfolders", async () => {
		const roles = await loadRoles(
			vault({ "roles/sub/Poet.md": "verses" }),
			"roles",
		);

		expect(roles.map((role) => role.name)).toEqual(["Poet"]);
	});

	it("skips empty files and keeps the first of a duplicated name", async () => {
		const roles = await loadRoles(
			vault({
				"roles/Author.md": "root wins",
				"roles/sub/Author.md": "sub loses",
				"roles/Empty.md": "   \n",
			}),
			"roles",
		);

		expect(roles.map((role) => [role.name, role.instructions])).toEqual([
			["Author", "root wins"],
		]);
	});

	it("returns nothing when no folder is configured", async () => {
		expect(await loadRoles(vault({ "roles/A.md": "x" }), "")).toEqual([]);
	});

	it("returns nothing when the folder has no markdown files", async () => {
		expect(
			await loadRoles(vault({ "notes/Idea.md": "x" }), "roles"),
		).toEqual([]);
	});
});
