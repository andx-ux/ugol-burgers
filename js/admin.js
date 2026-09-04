(function(){
  var REPO_OWNER = 'andx-ux';
  var REPO_NAME = 'ugol-burgers';
  var FILE_PATH = 'data/menu.json';
  var BRANCH = 'master';
  var TOKEN_KEY = 'ugol_admin_gh_token';

  var CATEGORY_OPTIONS = [
    {value:'burgers', label:'Бургеры'},
    {value:'sides', label:'Сайды'},
    {value:'drinks', label:'Напитки'}
  ];
  var HEAT_OPTIONS = [
    {value:'0', label:'нет'},
    {value:'1', label:'1 🔥'},
    {value:'2', label:'2 🔥🔥'},
    {value:'3', label:'3 🔥🔥🔥'}
  ];

  function ApiError(status, message){
    this.status = status;
    this.message = message;
  }
  ApiError.prototype = Object.create(Error.prototype);

  function b64EncodeUnicode(str){
    var bytes = new TextEncoder().encode(str);
    var binary = '';
    bytes.forEach(function(b){ binary += String.fromCharCode(b); });
    return btoa(binary);
  }
  function b64DecodeUnicode(b64){
    var binary = atob(b64.replace(/\n/g, ''));
    var bytes = new Uint8Array(binary.length);
    for(var i = 0; i < binary.length; i++){ bytes[i] = binary.charCodeAt(i); }
    return new TextDecoder().decode(bytes);
  }

  function getToken(){ return localStorage.getItem(TOKEN_KEY) || ''; }
  function setToken(t){ localStorage.setItem(TOKEN_KEY, t); }
  function clearToken(){ localStorage.removeItem(TOKEN_KEY); }

  function apiHeaders(){
    return {
      'Authorization': 'Bearer ' + getToken(),
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    };
  }

  function parseErrorBody(res){
    return res.json().catch(function(){ return {}; }).then(function(body){
      throw new ApiError(res.status, body.message || res.statusText || ('HTTP ' + res.status));
    });
  }

  function fetchFile(){
    var url = 'https://api.github.com/repos/' + REPO_OWNER + '/' + REPO_NAME + '/contents/' + FILE_PATH + '?ref=' + BRANCH + '&_=' + Date.now();
    return fetch(url, {headers: apiHeaders()}).then(function(res){
      if(!res.ok) return parseErrorBody(res);
      return res.json();
    });
  }

  function saveFile(items, sha){
    var content = b64EncodeUnicode(JSON.stringify(items, null, 2) + '\n');
    var url = 'https://api.github.com/repos/' + REPO_OWNER + '/' + REPO_NAME + '/contents/' + FILE_PATH;
    return fetch(url, {
      method: 'PUT',
      headers: Object.assign({'Content-Type': 'application/json'}, apiHeaders()),
      body: JSON.stringify({
        message: 'Обновление меню через админку',
        content: content,
        sha: sha,
        branch: BRANCH
      })
    }).then(function(res){
      if(!res.ok) return parseErrorBody(res);
      return res.json();
    });
  }

  function newId(){
    return 'item-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  // ---- DOM refs ----
  var tokenCard = document.getElementById('token-card');
  var tokenInput = document.getElementById('token-input');
  var tokenSaveBtn = document.getElementById('token-save-btn');
  var editorCard = document.getElementById('editor-card');
  var statusEl = document.getElementById('admin-status');
  var listEl = document.getElementById('admin-list');
  var addBtn = document.getElementById('admin-add-btn');
  var saveBtn = document.getElementById('admin-save-btn');
  var forgetBtn = document.getElementById('admin-forget-btn');

  var state = { items: [], sha: null };

  function showStatus(message, type){
    statusEl.textContent = message;
    statusEl.className = 'admin-status show ' + (type || '');
  }
  function hideStatus(){
    statusEl.className = 'admin-status';
  }

  function selectHTML(field, options, current){
    return '<select data-field="' + field + '">' + options.map(function(o){
      return '<option value="' + o.value + '"' + (String(o.value) === String(current) ? ' selected' : '') + '>' + o.label + '</option>';
    }).join('') + '</select>';
  }

  function itemHTML(item, index){
    return '' +
      '<div class="admin-item" data-index="' + index + '" data-id="' + item.id + '">' +
        '<div class="admin-item-head">' +
          '<span class="admin-item-num">Товар ' + (index + 1) + '</span>' +
          '<button type="button" class="admin-item-remove" data-index="' + index + '">Удалить</button>' +
        '</div>' +
        '<div class="admin-grid">' +
          '<label class="admin-span2">Название<input data-field="name" value="' + (item.name || '').replace(/"/g, '&quot;') + '"></label>' +
          '<label>Категория' + selectHTML('category', CATEGORY_OPTIONS, item.category || 'burgers') + '</label>' +
          '<label>Цена, €<input type="number" min="0" step="0.01" data-field="price" value="' + (item.price != null ? item.price : '') + '"></label>' +
          '<label>Вес / объём<input data-field="weight" value="' + (item.weight || '').replace(/"/g, '&quot;') + '"></label>' +
          '<label>Острота' + selectHTML('heat', HEAT_OPTIONS, item.heat || 0) + '</label>' +
          '<label class="admin-span3">Описание под названием<input data-field="tag" value="' + (item.tag || '').replace(/"/g, '&quot;') + '"></label>' +
          '<label class="admin-span2">Ссылка на фото (необязательно)<input data-field="photo" value="' + (item.photo || '').replace(/"/g, '&quot;') + '"></label>' +
          '<label class="admin-checkbox"><input type="checkbox" data-field="featured"' + (item.featured ? ' checked' : '') + '> Крупная карточка</label>' +
        '</div>' +
        '<div class="admin-preview"><img data-role="preview" src="' + (item.photo || '') + '" alt="" ' + (item.photo ? '' : 'hidden') + '></div>' +
      '</div>';
  }

  function renderItems(){
    listEl.innerHTML = state.items.map(itemHTML).join('');
  }

  function collectItems(){
    return Array.from(listEl.querySelectorAll('.admin-item')).map(function(row){
      var get = function(f){ return row.querySelector('[data-field="' + f + '"]'); };
      var priceRaw = get('price').value;
      var heatRaw = get('heat').value;
      var item = {
        id: row.getAttribute('data-id'),
        category: get('category').value,
        name: get('name').value.trim(),
        tag: get('tag').value.trim(),
        price: priceRaw === '' ? 0 : Math.round(parseFloat(priceRaw) * 100) / 100,
        weight: get('weight').value.trim(),
        photo: get('photo').value.trim()
      };
      var heat = parseInt(heatRaw, 10) || 0;
      if(heat > 0) item.heat = heat;
      if(get('featured').checked) item.featured = true;
      return item;
    });
  }

  function validateItems(items){
    for(var i = 0; i < items.length; i++){
      var it = items[i];
      if(!it.name) return 'У товара №' + (i + 1) + ' пустое название.';
      if(!it.category) return 'У товара №' + (i + 1) + ' не выбрана категория.';
      if(!it.price || it.price <= 0) return 'У товара №' + (i + 1) + ' некорректная цена.';
    }
    return null;
  }

  listEl.addEventListener('click', function(e){
    var rm = e.target.closest('.admin-item-remove');
    if(rm){
      var row = rm.closest('.admin-item');
      if(confirm('Удалить «' + (row.querySelector('[data-field="name"]').value || 'этот товар') + '»?')){
        row.remove();
        Array.from(listEl.querySelectorAll('.admin-item')).forEach(function(r, i){
          r.setAttribute('data-index', i);
          r.querySelector('.admin-item-num').textContent = 'Товар ' + (i + 1);
        });
      }
    }
  });

  listEl.addEventListener('input', function(e){
    if(e.target.getAttribute('data-field') === 'photo'){
      var row = e.target.closest('.admin-item');
      var preview = row.querySelector('[data-role="preview"]');
      var url = e.target.value.trim();
      preview.src = url;
      preview.hidden = !url;
    }
  });

  addBtn.addEventListener('click', function(){
    var blank = {
      id: newId(),
      category: 'burgers',
      name: '',
      tag: '',
      price: '',
      weight: '',
      photo: ''
    };
    listEl.insertAdjacentHTML('beforeend', itemHTML(blank, listEl.children.length));
    listEl.lastElementChild.scrollIntoView({behavior: 'smooth', block: 'center'});
    listEl.lastElementChild.querySelector('[data-field="name"]').focus();
  });

  function setSaving(saving){
    saveBtn.disabled = saving;
    saveBtn.textContent = saving ? 'Сохраняю…' : 'Сохранить изменения';
  }

  saveBtn.addEventListener('click', function(){
    var items = collectItems();
    var error = validateItems(items);
    if(error){ showStatus(error, 'error'); return; }

    setSaving(true);
    hideStatus();
    fetchFile()
      .then(function(fileData){ return saveFile(items, fileData.sha); })
      .then(function(){
        showStatus('Сохранено! Сайт обновится за 30–60 секунд.', 'success');
        state.items = items;
      })
      .catch(function(err){ showStatus(describeError(err), 'error'); })
      .finally(function(){ setSaving(false); });
  });

  function describeError(err){
    if(err.status === 401) return 'Токен недействителен или истёк. Нажмите «Сменить токен» и создайте новый.';
    if(err.status === 403) return 'Нет прав на запись. У токена должен быть доступ «Contents: Read and write» к репозиторию ' + REPO_OWNER + '/' + REPO_NAME + '.';
    if(err.status === 404) return 'Файл data/menu.json не найден в репозитории.';
    if(err.status === 409) return 'Кто-то ещё сохранил меню параллельно. Обновите страницу и повторите.';
    return 'Ошибка: ' + err.message;
  }

  function loadMenu(){
    showStatus('Загрузка меню…', 'loading');
    fetchFile()
      .then(function(fileData){
        state.sha = fileData.sha;
        state.items = JSON.parse(b64DecodeUnicode(fileData.content));
        renderItems();
        hideStatus();
      })
      .catch(function(err){ showStatus(describeError(err), 'error'); });
  }

  function showEditor(){
    tokenCard.hidden = true;
    editorCard.hidden = false;
    loadMenu();
  }
  function showTokenForm(){
    tokenCard.hidden = false;
    editorCard.hidden = true;
  }

  tokenSaveBtn.addEventListener('click', function(){
    var t = tokenInput.value.trim();
    if(!t){ return; }
    setToken(t);
    tokenInput.value = '';
    showEditor();
  });

  forgetBtn.addEventListener('click', function(){
    clearToken();
    showTokenForm();
  });

  if(getToken()){
    showEditor();
  } else {
    showTokenForm();
  }
})();
