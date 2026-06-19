(async () => {
  // 1. Load Turndown from unpkg
  const TurndownService = await import('https://unpkg.com/turndown?module').then(m => m.default);
  const turndownService = new TurndownService();

  // 2. Extract metadata for YAML Frontmatter
  const metadata = {
    title: document.title,
    url: window.location.href,
    date: new Date().toISOString(),
    author: document.querySelector('meta[name="author"]')?.content || 'Unknown'
  };

  const yamlFrontmatter = `---\n${Object.entries(metadata).map(([k, v]) => `${k}: "${v}"`).join('\n')}\n---\n\n`;

  // 3. Create the Apple-inspired button
  const btn = document.createElement('button');
  btn.innerHTML = '<span>Export MD</span>';
  Object.assign(btn.style, {
    position: 'fixed', bottom: '30px', right: '30px', zIndex: '9999',
    padding: '12px 24px', borderRadius: '25px', border: 'none',
    backgroundColor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(10px)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.1)', cursor: 'pointer',
    fontSize: '15px', fontWeight: '500', transition: 'all 0.3s ease'
  });

  // 4. Click Handler: Convert and Download
  btn.onclick = () => {
    const markdown = yamlFrontmatter + turndownService.turndown(document.body);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${document.title.replace(/\s+/g, '-').toLowerCase()}.md`;
    a.click();
  };

  document.body.appendChild(btn);
})();