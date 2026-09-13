import { marked } from "https://cdn.jsdelivr.net/npm/marked@15.0.6/+esm";
import source from "../../../docs/pipeline-walkthrough-instagram-image-example.md?raw";

const root = document.getElementById("content");
if (!root) throw new Error("#content missing");

marked.setOptions({ gfm: true, breaks: false });
root.innerHTML = marked.parse(source);
root.removeAttribute("aria-busy");
