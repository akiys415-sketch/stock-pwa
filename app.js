/* ==========================================
   Apps Script API
========================================== */

const API_URL =
  "https://script.google.com/macros/s/AKfycbw8rO3sRLbi0sxaTsR9IVramZTMz2HUcyUwZBq0Tw0BfPC4KwgAyYDc56GwB-_tVAMd0Q/exec";


/* ==========================================
   状態
========================================== */

let inventory = [];

let selectedKana = "all";

let orderOnly = false;

let searchText = "";

const updatingItems = new Set();


/* ==========================================
   DOM
========================================== */

const inventoryList =
  document.getElementById("inventoryList");

const searchInput =
  document.getElementById("searchInput");

const kanaFilter =
  document.getElementById("kanaFilter");

const orderFilterButton =
  document.getElementById("orderFilterButton");

const reloadButton =
  document.getElementById("reloadButton");

const itemCount =
  document.getElementById("itemCount");

const toast =
  document.getElementById("toast");


/* ==========================================
   初期化
========================================== */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    setupEvents();

    loadInventory();

  }
);


/* ==========================================
   イベント
========================================== */

function setupEvents() {

  /* 検索 */

  searchInput.addEventListener(
    "input",
    event => {

      searchText =
        event.target.value.trim();

      renderInventory();

    }
  );


  /* カナ絞り込み */

  kanaFilter.addEventListener(
    "click",
    event => {

      const button =
        event.target.closest(".kana-button");

      if (!button) return;


      selectedKana =
        button.dataset.kana;


      document
        .querySelectorAll(".kana-button")
        .forEach(btn =>
          btn.classList.remove("active")
        );


      button.classList.add("active");


      renderInventory();

    }
  );


  /* 発注必要のみ */

  orderFilterButton.addEventListener(
    "click",
    () => {

      orderOnly = !orderOnly;


      orderFilterButton
        .classList
        .toggle(
          "active",
          orderOnly
        );


      renderInventory();

    }
  );


  /* 更新 */

  reloadButton.addEventListener(
    "click",
    () => {

      loadInventory();

    }
  );


  /* ＋ / − */

  inventoryList.addEventListener(
    "click",
    event => {

      const button =
        event.target.closest(
          ".stock-button"
        );

      if (!button) return;


      const id =
        button.dataset.id;

      const amount =
        Number(
          button.dataset.amount
        );


      adjustStock(
        id,
        amount
      );

    }
  );

}


/* ==========================================
   在庫取得
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
        `${API_URL}?action=list&t=${Date.now()}`
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
        "データ取得に失敗しました"
      );

    }


    inventory =
      Array.isArray(data.items)
        ? data.items
        : [];


    renderInventory();


  } catch (error) {

    console.error(error);


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

    reloadButton.disabled = false;

  }

}


/* ==========================================
   表示
========================================== */

function renderInventory() {

  let items =
    [...inventory];


  /* 検索 */

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


  /* カナ */

  if (selectedKana !== "all") {

    items =
      items.filter(item => {

        return (
          getKanaGroup(item.kana)
          ===
          selectedKana
        );

      });

  }


  /* 発注必要 */

  if (orderOnly) {

    items =
      items.filter(
        item =>
          Number(item.stock) <
          Number(item.minimumStock)
      );

  }


  /* カナ順 */

  items.sort(
    (a, b) => {

      return String(a.kana)
        .localeCompare(
          String(b.kana),
          "ja",
          {
            sensitivity: "base",
            numeric: true
          }
        );

    }
  );


  /* 件数 */

  itemCount.textContent =
    `${items.length}件表示 / 全${inventory.length}件`;


  /* 0件 */

  if (items.length === 0) {

    inventoryList.innerHTML =
      `
        <div class="empty-message">
          該当する商品はありません
        </div>
      `;

    return;

  }


  /* HTML作成 */

  inventoryList.innerHTML =
    items
      .map(createItemHTML)
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
    Number(item.minimumStock) || 0;


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


  let statusClass = "";

  let statusText = "在庫OK";


  if (stock === 0) {

    statusClass = "zero";

    statusText = "在庫なし";

  } else if (orderNeeded) {

    statusClass = "warning";

    statusText =
      `発注必要・不足${shortage}本`;

  }


  const imageHTML =
    item.imageUrl
      ?
      `
        <img
          class="item-image"
          src="${escapeHTML(item.imageUrl)}"
          alt=""
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


  return `
    <article
      class="
        item-card
        ${orderNeeded ? "order-needed" : ""}
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
          ${updating || stock <= 0
            ? "disabled"
            : ""}
        >
          −
        </button>


        <button
          class="stock-button plus"
          type="button"
          data-id="${escapeHTML(item.id)}"
          data-amount="1"
          ${updating
            ? "disabled"
            : ""}
        >
          ＋
        </button>

      </div>

    </article>
  `;

}


/* ==========================================
   在庫変更
========================================== */

async function adjustStock(
  id,
  amount
) {

  id = String(id);


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


  if (!item) return;


  const oldStock =
    Number(item.stock) || 0;


  const temporaryStock =
    Math.max(
      0,
      oldStock + amount
    );


  /* 先に画面を変更 */

  item.stock =
    temporaryStock;


  updatingItems.add(id);


  renderInventory();


  try {

    const response =
      await fetch(
        API_URL,
        {
          method: "POST",

          body: JSON.stringify({
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


    /* サーバー側の値で確定 */

    item.stock =
      Number(
        data.item.stock
      );


    item.updatedAt =
      data.item.updatedAt;


  } catch (error) {

    console.error(error);


    /* 失敗した場合は元に戻す */

    item.stock =
      oldStock;


    showToast(
      "在庫の変更に失敗しました"
    );

  } finally {

    updatingItems.delete(id);


    renderInventory();

  }

}


/* ==========================================
   カナ分類
========================================== */

function getKanaGroup(text) {

  if (!text) return "";


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
    const [group, chars]
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
   ひらがな → カタカナ
   濁点・半濁点除去
========================================== */

function normalizeKana(text) {

  let value =
    String(text || "")
      .normalize("NFKC");


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


  /* ガ → カ
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
    .replace(/\s+/g, "");

}


/* ==========================================
   画像エラー
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

let toastTimer;

function showToast(message) {

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

  return String(value ?? "")
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