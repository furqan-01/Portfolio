# DNS Infrastructure Walkthrough

**Author:** Furqan Naveed  
**Track:** FlyRank Internship Program — Core Build  
**Topic:** How the Domain Name System (DNS) Works & The Lifecycle of a Web Request  

---

## 1. What is DNS? (The Phonebook of the Internet)

Computers that power the internet do not communicate using human-readable names like `furqannaveed.netlify.app` or `google.com`. Instead, they locate and talk to each other using numerical addresses known as **IP addresses** (for example, `104.198.14.52` for IPv4 or `2607:f8b0:4005:805::200e` for IPv6).

If humans had to memorize strings of numbers for every website we visit, the internet would be practically unusable. The **Domain Name System (DNS)** solves this problem. It operates like the internet's universal phonebook: whenever you type a website name into your browser, DNS translates that friendly name into the exact numerical IP address of the server hosting the website.

---

## 2. What is a CNAME Record? (The Digital Alias)

In DNS management, you create different types of "records" depending on what kind of information you need to map:

*   **A Record (Address Record):** Directly maps a hostname to a specific, static IPv4 address (e.g., `example.com` → `192.0.2.1`).
*   **CNAME Record (Canonical Name Record):** Maps one domain name to another domain name instead of a static IP address. It functions as an alias or redirect pointer.

### Why is a CNAME so useful for modern hosting (like Netlify, Vercel, or Cloudflare)?
Modern cloud platforms operate massive distributed networks with thousands of edge servers. Their IP addresses can change frequently due to load balancing, DDoS protection, or server maintenance. 

Instead of asking you to update your DNS every time an IP address shifts, the host instructs you to create a **CNAME record**:
*   Example: `portfolio.furqannaveed.com` **CNAME** `furqan-portfolio.netlify.app`

When someone visits `portfolio.furqannaveed.com`, DNS looks at the CNAME, redirects the search to `furqan-portfolio.netlify.app`, and resolves Netlify's active IP address dynamically.

*(Note: Under official DNS specifications (RFC 1912), a CNAME cannot be placed on the "root" or apex domain like `furqannaveed.com`, only on subdomains like `www.furqannaveed.com` or `portfolio.furqannaveed.com`. Apex domains typically use A/AAAA records or modern ALIAS/ANAME records provided by managed DNS providers).*

---

## 3. What Actually Happens Between Typing an Address and the Host Answering?

Here is the exact step-by-step journey that occurs in milliseconds when a user opens a browser, types `https://furqannaveed.netlify.app`, and hits Enter:

```
[User Browser]
      │
      ▼  (1. Check Browser / OS Cache)
[Local Resolver / ISP Recursive Resolver]
      │
      ▼  (2. Ask: "Where is .app?")
[Root Nameserver (.)]
      │
      ▼  (3. Ask: "Where is netlify.app?")
[TLD Nameserver (.app)]
      │
      ▼  (4. Ask: "What is the IP of furqannaveed.netlify.app?")
[Authoritative Nameserver (Netlify DNS)]
      │
      ▼  (5. Returns IP: 104.198.14.52)
[Browser Connects via TCP & HTTPS/TLS Handshake]
      │
      ▼  (6. HTTP GET Request / Response)
[Web Host Server (Netlify Edge Node)]
```

### Step 1: The Local Check (Browser & Operating System Cache)
Before sending requests out to the internet, your browser first checks its own temporary memory (DNS cache). If you've visited the site recently, it immediately uses the cached IP address. If not, it checks your computer's Operating System cache and your local `hosts` file.

### Step 2: The Recursive Resolver (Your Internet Courier)
If the local machine doesn't have the answer, it sends a query to a **Recursive Resolver** (typically provided by your Internet Service Provider, or a public resolver like Google `8.8.8.8` or Cloudflare `1.1.1.1`). The recursive resolver acts like a helpful courier whose job is to travel the world to find your answer.

### Step 3: The Root Nameserver (`.`)
The recursive resolver starts at the top of the DNS hierarchy: the **Root Nameserver**. There are 13 logical root server clusters worldwide. The root server doesn't know the specific IP of your website, but it knows where the Top-Level Domain (TLD) servers live. It inspects `.app` and replies: *"I don't know the exact site, but go ask the `.app` TLD Nameserver at this location."*

### Step 4: The TLD Nameserver (`.app` / `.com`)
The resolver contacts the `.app` TLD Nameserver (managed by the registry responsible for `.app` domains). The TLD server replies: *"I don't host the files, but I know the official Authoritative Nameservers designated for `netlify.app` (e.g., `dns1.p01.nsone.net`). Go ask them."*

### Step 5: The Authoritative Nameserver (The Definitive Answer)
The resolver queries the **Authoritative Nameserver**. This server holds the official DNS zone file for the domain. It looks up `furqannaveed.netlify.app`, finds the matching record, and responds with the server's IP address (e.g., `104.198.14.52`) along with a **TTL (Time to Live)** value, which specifies how long the resolver may cache the answer before asking again.

### Step 6: Response & Connection
The recursive resolver delivers the IP address back to your browser. Your browser can now connect directly to that IP:
1.  **TCP 3-Way Handshake:** Establishes a reliable connection between client and server (SYN → SYN-ACK → ACK).
2.  **TLS/HTTPS Handshake:** The browser and host securely exchange encryption certificates to ensure all traffic is private and authenticated.
3.  **HTTP Request & Response:** The browser sends `GET / HTTP/2`, and the host server returns the HTML, CSS, JavaScript, and asset files.

Your screen renders the portfolio page — all within 50 to 150 milliseconds!
