(() => {
  const search = document.getElementById('search');
  const cards = [...document.querySelectorAll('.article-card')];
  const categoryButtons = [...document.querySelectorAll('[data-category]')];
  const result = document.getElementById('result-count');
  const empty = document.getElementById('empty');
  let category = 'all';
  let query = '';
  const normalize = text => (text || '').normalize('NFKC').toLocaleLowerCase('ja-JP');
  const update = () => {
    let count = 0;
    for (const card of cards) {
      const matchText = normalize(card.dataset.filter).includes(query);
      const matchCategory = category === 'all' || card.querySelector('.category-pill')?.textContent === category;
      const visible = matchText && matchCategory;
      card.hidden = !visible;
      if (visible) count++;
    }
    empty.hidden = count !== 0;
    result.textContent = `${count} 件の記事を表示中`;
  };
  search?.addEventListener('input', () => { query = normalize(search.value.trim()); update(); });
  categoryButtons.forEach(button => button.addEventListener('click', () => {
    category = button.dataset.category;
    categoryButtons.forEach(b => {const current = b === button; b.classList.toggle('active',current);b.setAttribute('aria-pressed',String(current));});
    update();
  }));
  update();
})();
