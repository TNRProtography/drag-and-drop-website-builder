/**
 * EXAMPLE: A complete saved page document + its rendered HTML output.
 * 
 * This is what gets stored in D1 (pages.page_data) and
 * what the renderer converts to static HTML for publishing.
 */

// ── INPUT: Saved page JSON ───────────────────────────────────
export const EXAMPLE_PAGE_DOC = {
  id: "pg_01j9x2k3n4m5p6q7",
  meta: {
    title: "Aurora Forecast NZ — Home",
    description: "Real-time southern lights forecasts for New Zealand.",
    ogImage: "https://website-builder-assets.r2.dev/demo/og.jpg",
    favicon: "/favicon.ico"
  },
  breakpoints: {
    desktop: 1440,
    tablet: 768,
    mobile: 375
  },
  nodes: [
    {
      id: "root",
      type: "container",
      name: "Page root",
      props: {},
      styles: {
        desktop: {
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          fontFamily: "system-ui, sans-serif"
        }
      },
      children: [
        // ── HERO SECTION ──────────────────────────────────────
        {
          id: "hero",
          type: "section",
          name: "Hero",
          props: {},
          styles: {
            desktop: {
              background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)",
              padding: "80px 20px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center"
            },
            mobile: {
              padding: "48px 16px"
            }
          },
          children: [
            {
              id: "hero-heading",
              type: "heading",
              name: "Hero title",
              props: { text: "See the Aurora Australis Tonight", level: 1 },
              styles: {
                desktop: {
                  fontSize: "3.5rem",
                  fontWeight: "800",
                  color: "#f8fafc",
                  lineHeight: "1.1",
                  maxWidth: "700px",
                  marginBottom: "20px"
                },
                tablet: { fontSize: "2.5rem" },
                mobile: { fontSize: "2rem" }
              }
            },
            {
              id: "hero-subtext",
              type: "text",
              name: "Hero subtitle",
              props: { text: "Live Kp index, solar wind data, and cloud-cover maps — updated every minute." },
              styles: {
                desktop: {
                  fontSize: "1.2rem",
                  color: "#94a3b8",
                  maxWidth: "520px",
                  marginBottom: "36px",
                  lineHeight: "1.7"
                }
              }
            },
            {
              id: "hero-cta",
              type: "button",
              name: "CTA button",
              props: { label: "View Tonight's Forecast →", href: "/forecast" },
              styles: {
                desktop: {
                  display: "inline-block",
                  padding: "14px 32px",
                  background: "#22c55e",
                  color: "#052e16",
                  borderRadius: "8px",
                  fontWeight: "700",
                  fontSize: "1.05rem",
                  textDecoration: "none",
                  border: "none",
                  cursor: "pointer"
                }
              }
            }
          ]
        },

        // ── FEATURES ROW ──────────────────────────────────────
        {
          id: "features",
          type: "section",
          name: "Features",
          props: {},
          styles: {
            desktop: {
              padding: "64px 20px",
              background: "#ffffff"
            }
          },
          children: [
            {
              id: "features-heading",
              type: "heading",
              name: "Section heading",
              props: { text: "Everything you need", level: 2 },
              styles: {
                desktop: {
                  textAlign: "center",
                  fontSize: "2rem",
                  fontWeight: "700",
                  color: "#111827",
                  marginBottom: "48px"
                }
              }
            },
            {
              id: "features-row",
              type: "row",
              name: "Feature cards",
              props: {},
              styles: {
                desktop: {
                  display: "flex",
                  flexDirection: "row",
                  gap: "24px",
                  maxWidth: "1100px",
                  margin: "0 auto",
                  flexWrap: "wrap",
                  justifyContent: "center"
                }
              },
              children: [
                {
                  id: "feat-1",
                  type: "container",
                  name: "Feature 1",
                  props: {},
                  styles: {
                    desktop: {
                      flex: "1",
                      minWidth: "240px",
                      maxWidth: "320px",
                      padding: "28px",
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px"
                    }
                  },
                  children: [
                    {
                      id: "feat-1-icon",
                      type: "text",
                      props: { text: "🌌" },
                      styles: { desktop: { fontSize: "2rem" } }
                    },
                    {
                      id: "feat-1-title",
                      type: "heading",
                      props: { text: "Live KP Index", level: 3 },
                      styles: { desktop: { fontSize: "1.1rem", fontWeight: "700", color: "#111" } }
                    },
                    {
                      id: "feat-1-body",
                      type: "text",
                      props: { text: "Real-time geomagnetic activity data streamed from NOAA." },
                      styles: { desktop: { fontSize: "0.9rem", color: "#64748b", lineHeight: "1.6" } }
                    }
                  ]
                },
                {
                  id: "feat-2",
                  type: "container",
                  name: "Feature 2",
                  props: {},
                  styles: {
                    desktop: {
                      flex: "1", minWidth: "240px", maxWidth: "320px", padding: "28px",
                      borderRadius: "12px", border: "1px solid #e2e8f0",
                      display: "flex", flexDirection: "column", gap: "10px"
                    }
                  },
                  children: [
                    { id: "feat-2-icon", type: "text", props: { text: "📡" }, styles: { desktop: { fontSize: "2rem" } } },
                    { id: "feat-2-title", type: "heading", props: { text: "Solar Wind Data", level: 3 }, styles: { desktop: { fontSize: "1.1rem", fontWeight: "700", color: "#111" } } },
                    { id: "feat-2-body",  type: "text", props: { text: "Bz, Bt, speed and density from the DSCOVR satellite at L1." }, styles: { desktop: { fontSize: "0.9rem", color: "#64748b", lineHeight: "1.6" } } }
                  ]
                },
                {
                  id: "feat-3",
                  type: "container",
                  name: "Feature 3",
                  props: {},
                  styles: {
                    desktop: {
                      flex: "1", minWidth: "240px", maxWidth: "320px", padding: "28px",
                      borderRadius: "12px", border: "1px solid #e2e8f0",
                      display: "flex", flexDirection: "column", gap: "10px"
                    }
                  },
                  children: [
                    { id: "feat-3-icon", type: "text", props: { text: "🔔" }, styles: { desktop: { fontSize: "2rem" } } },
                    { id: "feat-3-title", type: "heading", props: { text: "Push Alerts", level: 3 }, styles: { desktop: { fontSize: "1.1rem", fontWeight: "700", color: "#111" } } },
                    { id: "feat-3-body",  type: "text", props: { text: "Get notified on your phone the moment aurora conditions are favourable." }, styles: { desktop: { fontSize: "0.9rem", color: "#64748b", lineHeight: "1.6" } } }
                  ]
                }
              ]
            }
          ]
        },

        // ── FOOTER ────────────────────────────────────────────
        {
          id: "footer",
          type: "section",
          name: "Footer",
          props: {},
          styles: {
            desktop: {
              background: "#0f172a",
              padding: "32px 20px",
              textAlign: "center"
            }
          },
          children: [
            {
              id: "footer-text",
              type: "text",
              props: { text: "© 2026 Aurora NZ · Built with ⬡ Builder" },
              styles: { desktop: { color: "#475569", fontSize: "0.85rem" } }
            }
          ]
        }
      ]
    }
  ]
};

// ── OUTPUT: What the renderer produces ───────────────────────
// (trimmed for readability — actual output is minified)
export const EXAMPLE_RENDERED_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Aurora Forecast NZ — Home</title>
<meta name="description" content="Real-time southern lights forecasts for New Zealand.">
<meta property="og:title" content="Aurora Forecast NZ — Home">
<meta property="og:description" content="Real-time southern lights forecasts for New Zealand.">
<meta property="og:image" content="https://website-builder-assets.r2.dev/demo/og.jpg">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#1a1a1a}
img,video{max-width:100%;display:block}a{color:inherit}button{cursor:pointer}
.n-root{min-height:100vh;display:flex;flex-direction:column;font-family:system-ui,sans-serif}
.n-hero{background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);padding:80px 20px;display:flex;flex-direction:column;align-items:center;text-align:center}
.n-hero-heading{font-size:3.5rem;font-weight:800;color:#f8fafc;line-height:1.1;max-width:700px;margin-bottom:20px}
.n-hero-subtext{font-size:1.2rem;color:#94a3b8;max-width:520px;margin-bottom:36px;line-height:1.7}
.n-hero-cta{display:inline-block;padding:14px 32px;background:#22c55e;color:#052e16;border-radius:8px;font-weight:700;font-size:1.05rem;text-decoration:none;border:none;cursor:pointer}
/* ... responsive breakpoints ... */
@media(max-width:768px){.n-hero{padding:48px 16px}.n-hero-heading{font-size:2.5rem}}
@media(max-width:375px){.n-hero-heading{font-size:2rem}}
</style>
</head>
<body>
<div class="n-root">
  <div class="n-hero">
    <h1 class="n-hero-heading">See the Aurora Australis Tonight</h1>
    <p class="n-hero-subtext">Live Kp index, solar wind data, and cloud-cover maps — updated every minute.</p>
    <a href="/forecast" class="n-hero-cta">View Tonight's Forecast →</a>
  </div>
  <!-- ... features and footer sections ... -->
</div>
</body>
</html>`;
