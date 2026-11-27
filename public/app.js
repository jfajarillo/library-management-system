// Front-end logic: talks to the REST API with fetch().
const $ = (sel) => document.querySelector(sel);

async function api(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

let messageTimer;
function showMessage(text, type = 'success') {
  const box = $('#message');
  box.textContent = text;
  box.className = `message ${type}`;
  clearTimeout(messageTimer);
  messageTimer = setTimeout(() => box.classList.add('hidden'), 4000);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function run(action, successText) {
  try {
    await action();
    if (successText) showMessage(successText);
  } catch (err) {
    showMessage(err.message, 'error');
  }
}

// ---------- Tabs ----------
document.querySelectorAll('.tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b === btn));
    document.querySelectorAll('.panel').forEach((p) => p.classList.toggle('hidden', p.id !== btn.dataset.tab));
    refresh[btn.dataset.tab]();
  });
});

// ---------- Books ----------
async function loadBooks() {
  const search = $('#book-search').value.trim();
  const books = await api('GET', `/api/books${search ? `?search=${encodeURIComponent(search)}` : ''}`);
  $('#book-rows').innerHTML = books.length ? books.map((b) => `
    <tr>
      <td>${b.id}</td><td>${escapeHtml(b.title)}</td><td>${escapeHtml(b.author)}</td>
      <td>${escapeHtml(b.isbn || '—')}</td><td>${b.availableCopies} / ${b.totalCopies}</td>
      <td>
        <button class="small" onclick='editBook(${JSON.stringify(b).replace(/'/g, '&#39;')})'>Edit</button>
        <button class="small danger" onclick="deleteBook(${b.id})">Delete</button>
      </td>
    </tr>`).join('') : '<tr><td colspan="6" class="empty">No books found</td></tr>';
}

function resetBookForm() {
  $('#book-form').reset();
  $('#book-form').editId.value = '';
  $('#book-form-title').textContent = 'Add Book';
  $('#book-cancel').classList.add('hidden');
}

window.editBook = (b) => {
  const f = $('#book-form');
  f.editId.value = b.id; f.title.value = b.title; f.author.value = b.author;
  f.isbn.value = b.isbn || ''; f.totalCopies.value = b.totalCopies;
  $('#book-form-title').textContent = `Edit Book #${b.id}`;
  $('#book-cancel').classList.remove('hidden');
  f.title.focus();
};

window.deleteBook = (id) => {
  if (!confirm('Delete this book?')) return;
  run(async () => { await api('DELETE', `/api/books/${id}`); await loadBooks(); }, 'Book deleted');
};

$('#book-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const f = e.target;
  const data = { title: f.title.value, author: f.author.value, isbn: f.isbn.value, totalCopies: Number(f.totalCopies.value) };
  run(async () => {
    if (f.editId.value) await api('PUT', `/api/books/${f.editId.value}`, data);
    else await api('POST', '/api/books', data);
    resetBookForm();
    await loadBooks();
  }, 'Book saved');
});
$('#book-cancel').addEventListener('click', resetBookForm);
$('#book-search').addEventListener('input', () => run(loadBooks));

// ---------- Members ----------
async function loadMembers() {
  const members = await api('GET', '/api/members');
  $('#member-rows').innerHTML = members.length ? members.map((m) => `
    <tr>
      <td>${m.id}</td><td>${escapeHtml(m.name)}</td><td>${escapeHtml(m.email)}</td>
      <td>
        <button class="small" onclick='editMember(${JSON.stringify(m).replace(/'/g, '&#39;')})'>Edit</button>
        <button class="small danger" onclick="deleteMember(${m.id})">Delete</button>
      </td>
    </tr>`).join('') : '<tr><td colspan="4" class="empty">No members yet</td></tr>';
}

function resetMemberForm() {
  $('#member-form').reset();
  $('#member-form').editId.value = '';
  $('#member-form-title').textContent = 'Register Member';
  $('#member-cancel').classList.add('hidden');
}

window.editMember = (m) => {
  const f = $('#member-form');
  f.editId.value = m.id; f.name.value = m.name; f.email.value = m.email;
  $('#member-form-title').textContent = `Edit Member #${m.id}`;
  $('#member-cancel').classList.remove('hidden');
  f.name.focus();
};

window.deleteMember = (id) => {
  if (!confirm('Delete this member?')) return;
  run(async () => { await api('DELETE', `/api/members/${id}`); await loadMembers(); }, 'Member deleted');
};

$('#member-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const f = e.target;
  const data = { name: f.name.value, email: f.email.value };
  run(async () => {
    if (f.editId.value) await api('PUT', `/api/members/${f.editId.value}`, data);
    else await api('POST', '/api/members', data);
    resetMemberForm();
    await loadMembers();
  }, 'Member saved');
});
$('#member-cancel').addEventListener('click', resetMemberForm);

// ---------- Loans ----------
async function loadLoans() {
  const [loans, books, members] = await Promise.all([
    api('GET', `/api/loans${$('#loan-filter').value ? `?status=${$('#loan-filter').value}` : ''}`),
    api('GET', '/api/books'),
    api('GET', '/api/members'),
  ]);
  const bookName = Object.fromEntries(books.map((b) => [b.id, b.title]));
  const memberName = Object.fromEntries(members.map((m) => [m.id, m.name]));

  $('#loan-member').innerHTML = '<option value="">Select member…</option>' +
    members.map((m) => `<option value="${m.id}">${escapeHtml(m.name)}</option>`).join('');
  $('#loan-book').innerHTML = '<option value="">Select book…</option>' +
    books.map((b) => `<option value="${b.id}" ${b.availableCopies < 1 ? 'disabled' : ''}>${escapeHtml(b.title)} (${b.availableCopies} left)</option>`).join('');

  $('#loan-rows').innerHTML = loans.length ? loans.map((l) => `
    <tr>
      <td>${l.id}</td>
      <td>${escapeHtml(memberName[l.memberId] || `#${l.memberId}`)}</td>
      <td>${escapeHtml(bookName[l.bookId] || `#${l.bookId}`)}</td>
      <td>${l.borrowDate}</td><td>${l.dueDate}</td>
      <td><span class="badge ${l.status}">${l.status}</span></td>
      <td>${l.returnDate ? `₱${l.fine}` : '—'}</td>
      <td>${l.returnDate ? '' : `<button class="small" onclick="returnLoan(${l.id})">Return</button>`}</td>
    </tr>`).join('') : '<tr><td colspan="8" class="empty">No loans</td></tr>';
}

window.returnLoan = (id) => {
  run(async () => {
    const loan = await api('POST', `/api/loans/${id}/return`, {});
    showMessage(loan.fine > 0 ? `Book returned. Late fine: ₱${loan.fine}` : 'Book returned on time. No fine.');
    await loadLoans();
  });
};

$('#loan-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const memberId = Number($('#loan-member').value);
  const bookId = Number($('#loan-book').value);
  if (!memberId || !bookId) return showMessage('Choose a member and a book', 'error');
  run(async () => {
    const loan = await api('POST', '/api/loans', { memberId, bookId });
    showMessage(`Borrowed! Due on ${loan.dueDate}`);
    await loadLoans();
  });
});
$('#loan-filter').addEventListener('change', () => run(loadLoans));

const refresh = { books: () => run(loadBooks), members: () => run(loadMembers), loans: () => run(loadLoans) };
refresh.books();
