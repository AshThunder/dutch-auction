/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "on-surface": "#1d1b20",
        "surface-variant": "#e6e0e9",
        "on-error-container": "#93000a",
        "error-container": "#ffdad6",
        "inverse-surface": "#322f35",
        "on-secondary": "#ffffff",
        "surface-container-highest": "#e6e0e9",
        "on-primary-container": "#e0d2ff",
        "secondary-container": "#e1d4fd",
        "surface-container-high": "#ece6ee",
        "error": "#ba1a1a",
        "on-tertiary-fixed-variant": "#594400",
        "primary-fixed-dim": "#cfbcff",
        "surface": "#fdf7ff",
        "surface-container-low": "#f8f2fa",
        "on-primary-fixed-variant": "#4f378a",
        "tertiary": "#765b00",
        "background": "#fdf7ff",
        "surface-bright": "#fdf7ff",
        "on-secondary-fixed": "#1f1635",
        "inverse-on-surface": "#f5eff7",
        "secondary-fixed": "#e9ddff",
        "on-error": "#ffffff",
        "secondary": "#63597c",
        "on-surface-variant": "#494551",
        "primary-fixed": "#e9ddff",
        "secondary-fixed-dim": "#cdc0e9",
        "on-tertiary-fixed": "#241a00",
        "tertiary-container": "#c9a74d",
        "outline-variant": "#cbc4d2",
        "on-primary": "#ffffff",
        "on-background": "#1d1b20",
        "outline": "#7a7582",
        "on-secondary-fixed-variant": "#4b4263",
        "tertiary-fixed-dim": "#e7c365",
        "primary-container": "#6750a4",
        "on-tertiary-container": "#503d00",
        "on-secondary-container": "#645a7d",
        "on-tertiary": "#ffffff",
        "surface-container-lowest": "#ffffff",
        "surface-container": "#f2ecf4",
        "on-primary-fixed": "#22005d",
        "tertiary-fixed": "#ffdf93",
        "inverse-primary": "#cfbcff",
        "surface-dim": "#ded8e0",
        "primary": "#4f378a",
        "surface-tint": "#6750a4"
      },
      borderRadius: {
        "DEFAULT": "1rem",
        "lg": "2rem",
        "xl": "3rem",
        "full": "9999px"
      },
      spacing: {
        "sticky-padding": "32px",
        "margin-desktop": "48px",
        "unit": "8px",
        "gutter": "24px",
        "container-max": "1440px",
        "margin-mobile": "16px"
      },
      fontFamily: {
        "display-xl-mobile": ["Epilogue"],
        "label-mono": ["Space Mono"],
        "encrypted-data": ["Space Mono"],
        "headline-lg": ["Epilogue"],
        "body-md": ["Hanken Grotesk"],
        "display-xl": ["Epilogue"]
      },
      fontSize: {
        "display-xl-mobile": ["48px", { "lineHeight": "1.1", "letterSpacing": "-0.02em", "fontWeight": "700" }],
        "label-mono": ["12px", { "lineHeight": "1.0", "letterSpacing": "0.1em", "fontWeight": "500" }],
        "encrypted-data": ["14px", { "lineHeight": "1.0", "fontWeight": "700" }],
        "headline-lg": ["32px", { "lineHeight": "1.2", "fontWeight": "600" }],
        "body-md": ["16px", { "lineHeight": "1.6", "fontWeight": "400" }],
        "display-xl": ["80px", { "lineHeight": "1.05", "letterSpacing": "-0.04em", "fontWeight": "700" }]
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries')
  ],
}
