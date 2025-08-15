import type { CompressionLevel, ExportSettings } from "../types/settings";

export function getExportSettings(): ExportSettings {
	let element = document.getElementById("setting-archive-compression-level") as HTMLInputElement;
	const archive_compression_level: number = element.valueAsNumber;
	if (Number.isNaN(archive_compression_level)) {throw new Error("Archive compression level setting is NaN")};

	element = document.getElementById("setting-export-modified-only") as HTMLInputElement;
	const export_modified_only: boolean = element.checked;

	return {
		compressionLevel: archive_compression_level as CompressionLevel,
		modifiedOnly: export_modified_only
	};
}