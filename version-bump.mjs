import { readFileSync, writeFileSync } from "fs";

// Version to publish: npm sets npm_package_version for `npm version`, the
// release workflow passes it as an argument, package.json is the fallback.
const targetVersion =
	process.argv[2] ??
	process.env.npm_package_version ??
	JSON.parse(readFileSync("package.json", "utf8")).version;

const write = (path, value) =>
	writeFileSync(path, `${JSON.stringify(value, null, "\t")}\n`);

// Obsidian reads the released version from the manifest.
const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const { minAppVersion } = manifest;
manifest.version = targetVersion;
write("manifest.json", manifest);

// Obsidian maps every released plugin version to the app version it needs, so
// each release gets its own entry (also when minAppVersion is unchanged).
// Existing entries are left alone: they record what was released.
const versions = JSON.parse(readFileSync("versions.json", "utf8"));
if (!(targetVersion in versions)) {
	versions[targetVersion] = minAppVersion;
	write("versions.json", versions);
}
