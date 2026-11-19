# Obelisk website

A static project site with screenshots, an install guide, and links to the public modernization branch. Run it locally from the repository root.

```sh
python3 -m http.server 8781 --bind 127.0.0.1 --directory site
```

Open <http://127.0.0.1:8781/>. Netlify publishes this directory without building or exposing the Obelisk server. The site contains no live remote connection.

## Imagery

- `room.webp`, `pixels.webp`, and `remote.webp` are actual simulator and remote captures. The room shows a rendered installation. The remote was captured at 390 CSS pixels.
- `prototype.webp` comes from the original project photograph in `img/obelisk.jpg`.
- The mode posters and Keystone marks are copies of the assets used in the remote. When replacing them in the remote, update these exported copies.
- The homepage link preview uses `social.jpg`, a crop of the 3D simulator capture. The installation guide uses `social-installation.jpg`, cropped from the original hardware photograph. Both are 1200 × 630 JPEGs.

The hosted site is <https://obelisk.me/>. To update the manual deployment, upload this directory to the Obelisk project in Netlify. The public site links to the published `maintenance/modernize` branch so the documented simulator commands work.
