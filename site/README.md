# Obelisk website

The homepage embeds a browser-local build of the Obelisk simulator. Build and serve it from the repository root.

```sh
npm ci --ignore-scripts
npm run sitebuild
python3 -m http.server 8781 --bind 127.0.0.1 --directory site
```

Open <http://127.0.0.1:8781/>. Each display runs its own virtual matrix and mode engine. Its docked remote uses the same controller events as the Raspberry Pi. Netlify builds the simulator from the workspaces and proxies the public TTC feed for Billboard. On a plain static file server, Billboard shows the clock and a dash for unavailable arrivals.

## Imagery

- `room.webp`, `pixels.webp`, and `remote.webp` are actual simulator and remote captures. The room shows a rendered installation. The remote was captured at 390 CSS pixels.
- `prototype.webp` comes from the original project photograph in `img/obelisk.jpg`.
- The mode posters and Keystone marks are copies of the assets used in the remote. When replacing them in the remote, update these exported copies.
- The homepage link preview uses `social.jpg`, a crop of the 3D simulator capture. The installation guide uses `social-installation.jpg`, cropped from the original hardware photograph. Both are 1200 × 630 JPEGs.

The hosted site is <https://obelisk.me/>. For a manual deployment, run `npm run sitebuild` before uploading this directory to the Obelisk project in Netlify. The public site links to the published `maintenance/modernize` branch so the documented simulator commands work.
