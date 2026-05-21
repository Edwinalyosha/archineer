# Archineer Uganda LLP — VPS Deployment Brief
**For the Claude instance assisting with server-side setup.**

---

## Context

This is a fully static HTML/CSS/JS site (no build step, no Node.js, no database).
It is served via an **Nginx Docker container**, reverse-proxied by **Caddy** which is already running on this server handling other apps.

**Do not touch any existing containers, Caddyfile entries, or Docker networks unless explicitly instructed below.**

---

## Server Facts

| Item | Value |
|---|---|
| OS | Ubuntu 24.04 |
| Container runtime | Docker |
| Reverse proxy | Caddy (running in Docker) |
| Domain | archineerug.com |
| GitHub repo | https://github.com/Edwinalyosha/archineer.git |
| Site type | Static HTML — no build step required |

---

## Step 0 — Before You Start

Run these checks first. Do not proceed until each one is understood.

```bash
# 1. Confirm Docker is running
docker ps

# 2. Find the Caddy container name and its network(s)
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}" | grep -i caddy

# 3. List all Docker networks (you need to add the Nginx container to the same network Caddy uses)
docker network ls

# 4. Find where the Caddyfile lives on the host
docker inspect <caddy-container-name> | grep -A5 "Mounts"
# Look for a bind mount pointing to a Caddyfile or /etc/caddy directory
```

Record:
- Caddy container name: ___________
- Caddy's Docker network name: ___________
- Path to Caddyfile on host: ___________

---

## Step 1 — Choose a Deploy Directory

```bash
# Recommended location — change if the server uses a different convention
sudo mkdir -p /var/www/archineer
sudo chown $USER:$USER /var/www/archineer
```

---

## Step 2 — Clone the Repository

```bash
cd /var/www/archineer
git clone https://github.com/Edwinalyosha/archineer.git .
```

Verify the structure looks correct:
```bash
ls
# Expected: index.html  about.html  services.html  projects.html
#           contact.html  blog.html  building-in-the-dark.html
#           assets/  DEPLOY.md  .gitignore
```

---

## Step 3 — Upload the Hero Video (NOT in git — large binary file)

The site uses a hero background video that was excluded from git.
The file must be uploaded manually from the user's local machine.

**File:** `archineer hero.mp4`  
**Local path:** `C:\Users\edwin\Desktop\web design\archineer 3\assets\videos\archineer hero.mp4`  
**Destination on server:** `/var/www/archineer/assets/videos/archineer hero.mp4`

**Run this from the user's local machine (not the server):**
```bash
scp "C:\Users\edwin\Desktop\web design\archineer 3\assets\videos\archineer hero.mp4" \
    <user>@<server-ip>:/var/www/archineer/assets/videos/
```

Verify on the server after upload:
```bash
ls -lh /var/www/archineer/assets/videos/
# Should show archineer hero.mp4 with a non-zero file size
```

---

## Step 4 — Create the Nginx Docker Container

Create a compose file for the Archineer container:

```bash
cat > /var/www/archineer/docker-compose.yml << 'EOF'
services:
  archineer:
    image: nginx:alpine
    container_name: archineer
    restart: unless-stopped
    volumes:
      - .:/usr/share/nginx/html:ro
    networks:
      - caddy_network   # ← REPLACE with the actual Caddy network name from Step 0

networks:
  caddy_network:        # ← REPLACE with actual network name
    external: true
EOF
```

**Before running:** replace `caddy_network` with the real network name found in Step 0.

Start the container:
```bash
cd /var/www/archineer
docker compose up -d

# Verify it started
docker ps | grep archineer

# Check Nginx is serving files (should return HTML)
docker exec archineer wget -qO- http://localhost/index.html | head -5
```

---

## Step 5 — Add archineerug.com to the Caddyfile

Open the Caddyfile found in Step 0. Add this block — **append it, do not replace anything existing:**

```
archineerug.com {
    reverse_proxy archineer:80
    encode gzip
    header {
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
        Referrer-Policy strict-origin-when-cross-origin
    }
}
```

> `archineerug.com` will be given automatic HTTPS by Caddy via Let's Encrypt.
> The `archineer:80` refers to the container name set in docker-compose.yml.
> If the container name differs, adjust accordingly.

After editing the Caddyfile, reload Caddy **without restarting it** (safe for other sites):

```bash
docker exec <caddy-container-name> caddy reload --config /etc/caddy/Caddyfile
```

If that fails (config path differs), try:
```bash
docker exec <caddy-container-name> caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
# or
docker kill --signal=USR1 <caddy-container-name>
```

---

## Step 6 — Verify

```bash
# 1. Check Caddy picked up the new config with no errors
docker logs <caddy-container-name> --tail 20

# 2. Test HTTP → HTTPS redirect (should 301)
curl -I http://archineerug.com

# 3. Test HTTPS response (should 200)
curl -I https://archineerug.com

# 4. Check the actual page loads
curl -s https://archineerug.com | grep "<title>"
# Expected: <title>Archineer Uganda LLP | Better Spaces, Built Right</title>
```

---

## Step 7 — Set Up Auto-Deploy (Optional but Recommended)

To update the site in future: SSH in, then:

```bash
cd /var/www/archineer
git pull origin main
# No rebuild needed — Nginx serves files directly from the directory
```

You can automate this with a simple script at `/usr/local/bin/deploy-archineer`:
```bash
#!/bin/bash
cd /var/www/archineer && git pull origin main
echo "Archineer deployed at $(date)"
```
```bash
chmod +x /usr/local/bin/deploy-archineer
```

---

## What NOT to Do

- Do not `docker restart` the Caddy container — use `caddy reload` to avoid downtime for other sites
- Do not modify any existing Caddyfile blocks
- Do not modify any existing Docker networks or containers
- Do not run `docker compose down` anywhere except inside `/var/www/archineer`

---

## Rollback

If something breaks:

```bash
# Stop and remove the Archineer container only
cd /var/www/archineer
docker compose down

# Remove the archineerug.com block from the Caddyfile, then reload Caddy
docker exec <caddy-container-name> caddy reload --config /etc/caddy/Caddyfile
```

This leaves all other apps untouched.

---

## Site Architecture Reference (for the assisting Claude)

```
archineer/
├── index.html                  ← Homepage
├── about.html
├── services.html
├── projects.html
├── contact.html
├── blog.html
├── building-in-the-dark.html   ← Blog article
├── assets/
│   ├── css/site.css            ← Shared styles (engineering overlay, img-expand)
│   ├── js/
│   │   ├── site.js             ← Shared JS (cursor, scroll reveal, overlay)
│   │   └── tailwind-config.js  ← Central colour config for Tailwind CDN
│   ├── images/                 ← All project/service/logo images
│   └── videos/
│       └── archineer hero.mp4  ← Hero video (NOT in git — upload manually)
```

No build step. No npm. No compilation. Nginx serves these files as-is.
