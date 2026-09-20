/* ==========================================
   Apps Script API
========================================== */

const API_URL =
  "https://script.google.com/macros/s/AKfycbw8rO3sRLbi0sxaTsR9IVramZTMz2HUcyUwZBq0Tw0BfPC4KwgAyYDc56GwB-_tVAMd0Q/exec";


/* ==========================================
   アプリ状態
========================================== */

let inventory = [];

let selectedKana = "all";

let orderOnly = false;

let searchText = "";

let editingItemId = null;

const updatingItems = new Set();


/* ==========================================
   DOM
========================================== */

let inventoryList;
let searchInput;
let kanaFilter;
let orderFilterButton;
let reloadButton;
let itemCount;
let toast;

let addItemButton;

let editorModal;
let editorTitle;
let editorForm;

let closeEditorButton;
let cancelEditorButton;
let saveItemButton;

let itemNameInput;
let itemKanaInput;
let itemStockInput;
let itemMinimumStockInput;
let itemImageUrlInput;

let imagePreview;


/* ==========================================
   初期化
========================================== */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    getDOMElements();

    setupEvents();

    loadInventory();

  }
);


/* ==========================================
   DOM取得
========================================== */

function getDOMElements() {

  inventoryList =
    document.getElementById(
      "inventoryList"
    );

  searchInput =
    document.getElementById(
      "searchInput"
    );

  kanaFilter =
    document.getElementById(
      "kanaFilter"
    );

  orderFilterButton =
    document.getElementById(
      "orderFilterButton"
    );

  reloadButton =
    document.getElementById(
      "reloadButton"
    );

  itemCount =
    document.getElementById(
      "itemCount"
    );

  toast =
    document.getElementById(
      "toast"
    );


  /* 商品追加 */

  addItemButton =
    document.getElementById(
      "addItemButton"
    );


  /* 編集画面 */

  editorModal =
    document.getElementById(
      "editorModal"
    );

  editorTitle =
    document.getElementById(
      "editorTitle"
    );

  editorForm =
    document.getElementById(
      "editorForm"
    );

  closeEditorButton =
    document.getElementById(
      "closeEditorButton"
    );

  cancelEditorButton =
    document.getElementById(
      "cancelEditorButton"
    );

  saveItemButton =
    document.getElementById(
      "saveItemButton"
    );


  /* 入力欄 */

  itemNameInput =
    document.getElementById(
      "itemName"
    );

  itemKanaInput =
    document.getElementById(
      "itemKana"
    );

  itemStockInput =
    document.getElementById(
      "itemStock"
    );

  itemMinimumStockInput =
    document.getElementById(
      "itemMinimumStock"
    );

  itemImageUrlInput =
    document.getElementById(
      "itemImageUrl"
    );

  imagePreview =
    document.getElementById(
      "imagePreview"
    );

}


/* ==========================================
   イベント設定
========================================== */

function setupEvents() {

  /* --------------------------
     検索
  -------------------------- */

  searchInput.addEventListener(
    "input",
    event => {

      searchText =
        event.target.value.trim();

      renderInventory();

    }
  );


  /* --------------------------
     カナ絞り込み
  -------------------------- */

  kanaFilter.addEventListener(
    "click",
    event => {

      const button =
        event.target.closest(
          ".kana-button"
        );

      if (!button) return;


      selectedKana =
        button.dataset.kana;


      document
        .querySelectorAll(
          ".kana-button"
        )
        .forEach(btn => {

          btn.classList.remove(
            "active"
          );

        });


      button.classList.add(
        "active"
      );


      renderInventory();

    }
  );


  /* --------------------------
     発注必要のみ
  -------------------------- */

  orderFilterButton.addEventListener(
    "click",
    () => {

      orderOnly =
        !orderOnly;


      orderFilterButton
        .classList
        .toggle(
          "active",
          orderOnly
        );


      renderInventory();

    }
  );


  /* --------------------------
     再読み込み
  -------------------------- */

  reloadButton.addEventListener(
    "click",
    () => {

      loadInventory();

    }
  );


  /* --------------------------
     商品追加
  -------------------------- */

  addItemButton.addEventListener(
    "click",
    () => {

      openNewItemEditor();

    }
  );


  /* --------------------------
     商品一覧
     編集 / ＋ / −
  -------------------------- */

  inventoryList.addEventListener(
    "click",
    event => {

      /*
       編集
      */

      const editButton =
        event.target.closest(
          ".edit-item-button"
        );


      if (editButton) {

        openEditItemEditor(
          editButton.dataset.editId
        );

        return;

      }


      /*
       ＋ / −
      */

      const stockButton =
        event.target.closest(
          ".stock-button"
        );


      if (!stockButton) return;


      const id =
        stockButton.dataset.id;


      const amount =
        Number(
          stockButton.dataset.amount
        );


      adjustStock(
        id,
        amount
      );

    }
  );


  /* --------------------------
     編集画面を閉じる
  -------------------------- */

  closeEditorButton.addEventListener(
    "click",
    closeEditor
  );


  cancelEditorButton.addEventListener(
    "click",
    closeEditor
  );


  /* 背景クリック */

  editorModal.addEventListener(
    "click",
    event => {

      if (
        event.target === editorModal
      ) {

        closeEditor();

      }

    }
  );


  /* Escape */

  document.addEventListener(
    "keydown",
    event => {

      if (
        event.key === "Escape" &&
        !editorModal.hidden
      ) {

        closeEditor();

      }

    }
  );


  /* --------------------------
     商品保存
  -------------------------- */

  editorForm.addEventListener(
    "submit",
    saveItem
  );


  /* --------------------------
     画像プレビュー
  -------------------------- */

  itemImageUrlInput.addEventListener(
    "input",
    updateImagePreview
  );

}


/* ==========================================
   在庫一覧取得
========================================== */

async function loadInventory() {

  inventoryList.innerHTML =
    `
      <div class="loading">
        在庫を読み込んでいます...
      </div>
    `;


  reloadButton.disabled = true;


  try {

    const response =
      await fetch(
        `${API_URL}?action=list&t=${Date.now()}`,
        {
          cache: "no-store"
        }
      );


    if (!response.ok) {

      throw new Error(
        "在庫データを取得できませんでした"
      );

    }


    const data =
      await response.json();


    if (!data.success) {

      throw new Error(
        data.message ||
        "在庫データの取得に失敗しました"
      );

    }


    inventory =
      Array.isArray(data.items)
        ? data.items
        : [];


    renderInventory();


  } catch (error) {

    console.error(
      "loadInventory error:",
      error
    );


    inventoryList.innerHTML =
      `
        <div class="empty-message">
          在庫データを読み込めませんでした。
          <br>
          Apps ScriptのURLや公開設定を確認してください。
        </div>
      `;


    itemCount.textContent =
      "読み込みエラー";


    showToast(
      "在庫の読み込みに失敗しました"
    );


  } finally {

    reloadButton.disabled =
      false;

  }

}


/* ==========================================
   一覧表示
========================================== */

function renderInventory() {

  let items =
    [...inventory];


  /* --------------------------
     検索
  -------------------------- */

  if (searchText) {

    const query =
      normalizeSearchText(
        searchText
      );


    items =
      items.filter(item => {

        const name =
          normalizeSearchText(
            item.name
          );

        const kana =
          normalizeSearchText(
            item.kana
          );


        return (
          name.includes(query) ||
          kana.includes(query)
        );

      });

  }


  /* --------------------------
     カナ
  -------------------------- */

  if (
    selectedKana !== "all"
  ) {

    items =
      items.filter(item => {

        return (
          getKanaGroup(
            item.kana
          )
          ===
          selectedKana
        );

      });

  }


  /* --------------------------
     発注必要
  -------------------------- */

  if (orderOnly) {

    items =
      items.filter(item => {

        return (
          Number(item.stock) <
          Number(
            item.minimumStock
          )
        );

      });

  }


  /* --------------------------
     カナ順
  -------------------------- */

  items.sort(
    (a, b) => {

      return String(
        a.kana || ""
      ).localeCompare(
        String(
          b.kana || ""
        ),
        "ja",
        {
          sensitivity: "base",
          numeric: true
        }
      );

    }
  );


  /* --------------------------
     件数表示
  -------------------------- */

  itemCount.textContent =
    `${items.length}件表示 / 全${inventory.length}件`;


  /* --------------------------
     0件
  -------------------------- */

  if (
    items.length === 0
  ) {

    inventoryList.innerHTML =
      `
        <div class="empty-message">
          該当する商品はありません
        </div>
      `;

    return;

  }


  /* --------------------------
     HTML
  -------------------------- */

  inventoryList.innerHTML =
    items
      .map(
        createItemHTML
      )
      .join("");


  setupImageErrors();

}


/* ==========================================
   商品HTML
========================================== */

function createItemHTML(item) {

  const stock =
    Number(item.stock) || 0;


  const minimum =
    Number(
      item.minimumStock
    ) || 0;


  const shortage =
    Math.max(
      minimum - stock,
      0
    );


  const orderNeeded =
    stock < minimum;


  const updating =
    updatingItems.has(
      String(item.id)
    );


  /* --------------------------
     状態
  -------------------------- */

  let statusClass = "";

  let statusText =
    "在庫OK";


  if (stock === 0) {

    statusClass =
      "zero";

    statusText =
      "在庫なし";

  } else if (orderNeeded) {

    statusClass =
      "warning";

    statusText =
      `発注必要・不足${shortage}本`;

  }


  /* --------------------------
     画像
  -------------------------- */

  const imageHTML =
    item.imageUrl
      ?
      `
        <img
          class="item-image"
          src="${escapeHTML(item.imageUrl)}"
          alt="${escapeHTML(item.name)}"
          loading="lazy"
          data-product-image
        >
      `
      :
      `
        <div class="image-placeholder">
          🍾
        </div>
      `;


  /* --------------------------
     商品
  -------------------------- */

  return `
    <article
      class="
        item-card
        ${orderNeeded
          ? "order-needed"
          : ""}
      "
    >

      <div class="item-image-wrapper">
        ${imageHTML}
      </div>


      <div class="item-info">

        <div class="item-name">
          ${escapeHTML(item.name)}
        </div>

        <div class="item-kana">
          ${escapeHTML(item.kana)}
        </div>

        <button
          class="edit-item-button"
          type="button"
          data-edit-id="${escapeHTML(item.id)}"
        >
          編集
        </button>

      </div>


      <div class="stock-area">

        <span class="stock-number">
          ${stock}
        </span>

        <span class="stock-unit">
          本
        </span>

      </div>


      <div>

        <span
          class="
            stock-status
            ${statusClass}
          "
        >
          ${statusText}
        </span>

      </div>


      <div class="stock-controls">

        <button
          class="stock-button minus"
          type="button"
          data-id="${escapeHTML(item.id)}"
          data-amount="-1"
          ${
            updating ||
            stock <= 0
              ? "disabled"
              : ""
          }
        >
          −
        </button>


        <button
          class="stock-button plus"
          type="button"
          data-id="${escapeHTML(item.id)}"
          data-amount="1"
          ${
            updating
              ? "disabled"
              : ""
          }
        >
          ＋
        </button>

      </div>

    </article>
  `;

}


/* ==========================================
   在庫 ＋ / −
========================================== */

async function adjustStock(
  id,
  amount
) {

  id =
    String(id);


  if (
    updatingItems.has(id)
  ) {

    return;

  }


  const item =
    inventory.find(
      product =>
        String(product.id) === id
    );


  if (!item) {

    return;

  }


  const oldStock =
    Number(item.stock) || 0;


  const temporaryStock =
    Math.max(
      0,
      oldStock + amount
    );


  /*
   同じ値なら何もしない
  */

  if (
    temporaryStock ===
    oldStock
  ) {

    return;

  }


  /*
   まず画面だけ変更
  */

  item.stock =
    temporaryStock;


  updatingItems.add(
    id
  );


  renderInventory();


  try {

    const response =
      await fetch(
        API_URL,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "text/plain;charset=utf-8"
          },

          body:
            JSON.stringify({
              action: "adjust",
              id: id,
              amount: amount
            })
        }
      );


    if (!response.ok) {

      throw new Error(
        "在庫変更に失敗しました"
      );

    }


    const data =
      await response.json();


    if (!data.success) {

      throw new Error(
        data.message ||
        "在庫変更に失敗しました"
      );

    }


    /*
     Apps Script側の値で確定
    */

    item.stock =
      Number(
        data.item.stock
      ) || 0;


    item.updatedAt =
      data.item.updatedAt || "";


  } catch (error) {

    console.error(
      "adjustStock error:",
      error
    );


    /*
     失敗したら元に戻す
    */

    item.stock =
      oldStock;


    showToast(
      "在庫の変更に失敗しました"
    );


  } finally {

    updatingItems.delete(
      id
    );


    renderInventory();

  }

}


/* ==========================================
   新規商品画面
========================================== */

function openNewItemEditor() {

  editingItemId =
    null;


  editorTitle.textContent =
    "商品追加";


  editorForm.reset();


  itemStockInput.value =
    0;


  itemMinimumStockInput.value =
    1;


  imagePreview.innerHTML =
    "画像なし";


  editorModal.hidden =
    false;


  /*
   背景スクロール停止
  */

  document.body.style.overflow =
    "hidden";


  setTimeout(
    () => {

      itemNameInput.focus();

    },
    100
  );

}


/* ==========================================
   商品編集画面
========================================== */

function openEditItemEditor(id) {

  const item =
    inventory.find(
      product =>
        String(product.id) ===
        String(id)
    );


  if (!item) {

    showToast(
      "商品が見つかりません"
    );

    return;

  }


  editingItemId =
    String(id);


  editorTitle.textContent =
    "商品編集";


  itemNameInput.value =
    item.name || "";


  itemKanaInput.value =
    item.kana || "";


  itemStockInput.value =
    Number(item.stock) || 0;


  itemMinimumStockInput.value =
    Number(
      item.minimumStock
    ) || 0;


  itemImageUrlInput.value =
    item.imageUrl || "";


  updateImagePreview();


  editorModal.hidden =
    false;


  document.body.style.overflow =
    "hidden";

}


/* ==========================================
   編集画面を閉じる
========================================== */

function closeEditor() {

  editorModal.hidden =
    true;


  editingItemId =
    null;


  document.body.style.overflow =
    "";

}


/* ==========================================
   画像プレビュー
========================================== */

function updateImagePreview() {

  const url =
    itemImageUrlInput
      .value
      .trim();


  if (!url) {

    imagePreview.innerHTML =
      "画像なし";

    return;

  }


  imagePreview.innerHTML =
    `
      <img
        src="${escapeHTML(url)}"
        alt="商品画像プレビュー"
      >
    `;


  const image =
    imagePreview.querySelector(
      "img"
    );


  if (!image) return;


  image.addEventListener(
    "error",
    () => {

      imagePreview.innerHTML =
        "画像を読み込めません";

    },
    {
      once: true
    }
  );

}


/* ==========================================
   商品保存
========================================== */

async function saveItem(event) {

  event.preventDefault();


  const name =
    itemNameInput
      .value
      .trim();


  const kana =
    itemKanaInput
      .value
      .trim();


  if (!name) {

    showToast(
      "商品名を入力してください"
    );

    itemNameInput.focus();

    return;

  }


  if (!kana) {

    showToast(
      "商品名カナを入力してください"
    );

    itemKanaInput.focus();

    return;

  }


  const wasEditing =
    Boolean(
      editingItemId
    );


  const currentEditingId =
    editingItemId;


  const payload = {

    action:
      wasEditing
        ? "update"
        : "create",

    name: name,

    kana: kana,

    stock:
      Math.max(
        0,
        Number(
          itemStockInput.value
        ) || 0
      ),

    minimumStock:
      Math.max(
        0,
        Number(
          itemMinimumStockInput.value
        ) || 0
      ),

    imageUrl:
      itemImageUrlInput
        .value
        .trim()

  };


  if (wasEditing) {

    payload.id =
      currentEditingId;

  }


  saveItemButton.disabled =
    true;


  saveItemButton.textContent =
    "保存中...";


  try {

    const response =
      await fetch(
        API_URL,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "text/plain;charset=utf-8"
          },

          body:
            JSON.stringify(
              payload
            )
        }
      );


    if (!response.ok) {

      throw new Error(
        "保存に失敗しました"
      );

    }


    const data =
      await response.json();


    if (!data.success) {

      throw new Error(
        data.message ||
        "保存に失敗しました"
      );

    }


    const savedItem =
      data.item;


    /*
     編集
    */

    if (wasEditing) {

      const index =
        inventory.findIndex(
          item =>
            String(item.id) ===
            String(
              currentEditingId
            )
        );


      if (index !== -1) {

        inventory[index] =
          savedItem;

      }

    }


    /*
     新規
    */

    else {

      inventory.push(
        savedItem
      );

    }


    closeEditor();


    renderInventory();


    showToast(
      wasEditing
        ? "商品を更新しました"
        : "商品を追加しました"
    );


  } catch (error) {

    console.error(
      "saveItem error:",
      error
    );


    showToast(
      error.message ||
      "保存に失敗しました"
    );


  } finally {

    saveItemButton.disabled =
      false;


    saveItemButton.textContent =
      "保存";

  }

}


/* ==========================================
   カナ分類
========================================== */

function getKanaGroup(text) {

  if (!text) {

    return "";

  }


  const kana =
    normalizeKana(text);


  const first =
    kana.charAt(0);


  const groups = {

    a:
      "アイウエオァィゥェォ",

    ka:
      "カキクケコヵヶ",

    sa:
      "サシスセソ",

    ta:
      "タチツテトッ",

    na:
      "ナニヌネノ",

    ha:
      "ハヒフヘホ",

    ma:
      "マミムメモ",

    ya:
      "ヤユヨャュョ",

    ra:
      "ラリルレロ",

    wa:
      "ワヲン"

  };


  for (
    const [
      group,
      chars
    ]
    of Object.entries(groups)
  ) {

    if (
      chars.includes(first)
    ) {

      return group;

    }

  }


  return "";

}


/* ==========================================
   カナ正規化
========================================== */

function normalizeKana(text) {

  let value =
    String(
      text || ""
    )
      .normalize("NFKC");


  /*
   ひらがな → カタカナ
  */

  value =
    value.replace(
      /[ぁ-ゖ]/g,
      char =>
        String.fromCharCode(
          char.charCodeAt(0)
          +
          0x60
        )
    );


  /*
   ガ → カ
   パ → ハ
   ヴ → ウ
  */

  value =
    value
      .normalize("NFD")
      .replace(
        /[\u3099\u309A]/g,
        ""
      )
      .normalize("NFC");


  return value;

}


/* ==========================================
   検索用文字列
========================================== */

function normalizeSearchText(text) {

  return normalizeKana(text)
    .toLowerCase()
    .replace(
      /\s+/g,
      ""
    );

}


/* ==========================================
   商品画像エラー
========================================== */

function setupImageErrors() {

  document
    .querySelectorAll(
      "[data-product-image]"
    )
    .forEach(image => {

      image.addEventListener(
        "error",
        () => {

          const wrapper =
            image.parentElement;


          if (!wrapper) {

            return;

          }


          wrapper.innerHTML =
            `
              <div class="image-placeholder">
                🍾
              </div>
            `;

        },
        {
          once: true
        }
      );

    });

}


/* ==========================================
   Toast
========================================== */

let toastTimer = null;


function showToast(message) {

  if (!toast) {

    console.log(message);

    return;

  }


  clearTimeout(
    toastTimer
  );


  toast.textContent =
    message;


  toast.classList.add(
    "show"
  );


  toastTimer =
    setTimeout(
      () => {

        toast.classList.remove(
          "show"
        );

      },
      2200
    );

}


/* ==========================================
   HTMLエスケープ
========================================== */

function escapeHTML(value) {

  return String(
    value ?? ""
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

}
