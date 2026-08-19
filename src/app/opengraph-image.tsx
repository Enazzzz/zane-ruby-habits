import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Zane and Ruby weekly call streak tracker";

/**
 * Link-preview image for the shared tracker.
 */
export default function OpenGraphImage() {
	return new ImageResponse(
		(
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					width: "100%",
					height: "100%",
					background: "#131f24",
					color: "#f1f7fb",
				}}
			>
				<div
					style={{
						fontSize: 28,
						letterSpacing: 8,
						fontWeight: 800,
						color: "#58cc02",
					}}
				>
					WEEKLY CALLS
				</div>
				<div style={{ marginTop: 16, fontSize: 88, fontWeight: 900 }}>
					Zane & Ruby
				</div>
				<div style={{ marginTop: 12, fontSize: 36, color: "#afc0c7" }}>
					Five times a week. Keep the streak.
				</div>
			</div>
		),
		size,
	);
}
