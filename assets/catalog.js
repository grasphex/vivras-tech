(() => {
  const search = document.getElementById('search');
  const cards = [...document.querySelectorAll('.article-card')];
  const groupButtons = [...document.querySelectorAll('button[data-group]')];
  const categoryButtons = [...document.querySelectorAll('button[data-category]')];
  const result = document.getElementById('result-count');
  const empty = document.getElementById('empty');
  if (!search || !result || !empty) return;
  let group = 'all', category = 'all', query = '';
  const normalize = value => (value || '').normalize('NFKC').toLocaleLowerCase('ja-JP');
  function setPressed(buttons, selected) {
    buttons.forEach(b => {
      const active = b === selected;
      b.classList.toggle('active', active);
      b.setAttribute('aria-pressed', String(active));
    });
  }
  function update() {
    // The filter row must not show subcategories from another subject.
    categoryButtons.forEach(b => {
      const show = b.dataset.category === 'all' || group === 'all' || b.dataset.parent === group;
      b.hidden = !show;
    });
    let count = 0;
    for (const card of cards) {
      const visible = (group === 'all' || card.dataset.group === group)
        && (category === 'all' || card.dataset.category === category)
        && normalize(card.dataset.filter).includes(query);
      card.hidden = !visible;
      if (visible) count += 1;
    }
    empty.hidden = count > 0;
    result.textContent = `${count} 件の記事を表示中`;
  }
  search.addEventListener('input', () => { query = normalize(search.value.trim()); update(); });
  groupButtons.forEach(b => b.addEventListener('click', () => {
    group = b.dataset.group;
    category = 'all';
    setPressed(groupButtons, b);
    setPressed(categoryButtons, categoryButtons.find(c => c.dataset.category === 'all'));
    update();
  }));
  categoryButtons.forEach(b => b.addEventListener('click', () => {
    category = b.dataset.category;
    setPressed(categoryButtons, b);
    if (category !== 'all' && group !== 'all' && b.dataset.parent !== group) {
      group = b.dataset.parent;
      setPressed(groupButtons, groupButtons.find(x => x.dataset.group === group));
    }
    update();
  }));
  const params = new URLSearchParams(location.search);
  const targetGroup = params.get('group');
  const targetCategory = params.get('category');
  const initialGroup = groupButtons.find(b => b.dataset.group === targetGroup);
  if (initialGroup) { group = targetGroup; setPressed(groupButtons, initialGroup); }
  const initialCat = categoryButtons.find(b => b.dataset.category === targetCategory && (group === 'all' || b.dataset.parent === group));
  if (initialCat) { category = targetCategory; setPressed(categoryButtons, initialCat); }
  update();
})();