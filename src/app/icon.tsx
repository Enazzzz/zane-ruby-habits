import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/**
 * Tiny green app icon used in browser tabs.
 */
export default function Icon() {
	return new ImageResponse(
		(
			<div
				style={{
					width: "100%",
					height: "100%",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					background: "#58cc02",
					color: "#131f24",
					fontSize: 16,
					fontWeight: 800,
				}}
			>
				ZR
			</div>
		),
		size,
	);
}
