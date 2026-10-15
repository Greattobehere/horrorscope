// "Put HorrorScope on your phone" steps for the emails. Owner tested on iPhone: Safari
// needs the full address (https://www.horrorscope.art) before Add to Home Screen works.

export const SITE = "https://www.horrorscope.art";

export function installHtml(color = "#555") {
  return `
    <div style="font-size:14px;color:${color};line-height:1.6;margin-top:24px">
      <p style="margin:0 0 6px"><b>Put HorrorScope on your phone</b> (it works like an app, no download):</p>
      <p style="margin:0 0 4px"><b>iPhone:</b> open <a href="${SITE}" style="color:inherit">${SITE}</a> in Safari, tap the Share button
        (the square with the arrow), then tap <b>Add to Home Screen</b>.</p>
      <p style="margin:0"><b>Android:</b> open <a href="${SITE}" style="color:inherit">${SITE}</a> in Chrome, tap the ⋮ menu,
        then tap <b>Install app</b> (or <b>Add to Home screen</b>).</p>
    </div>`;
}

export const INSTALL_TEXT = [
  "Put HorrorScope on your phone (it works like an app, no download):",
  `iPhone: open ${SITE} in Safari, tap the Share button (the square with the arrow), then tap Add to Home Screen.`,
  `Android: open ${SITE} in Chrome, tap the menu (three dots), then tap Install app (or Add to Home screen).`,
].join("\n");
