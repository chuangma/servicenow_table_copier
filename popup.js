(function copyImmediately() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: getSelectedRows
    }, (results) => {
      const [result] = results;
      const text = result.result.text || "";
      const count = result.result.count || 0;

      if (text && count > 0) {
        navigator.clipboard.writeText(text).then(() => {
          showTemporaryAlert(`Copied ${count} row${count > 1 ? 's' : ''}!`, "success");
        });
      } else {
        showTemporaryAlert("No rows found.", "error");
      }
    });
  });
})();

function getSelectedRows() {
  const useMarkdown = true; // toggle this to switch formats

  function extractRows(doc) {
    let rows = doc.querySelectorAll("tr.is-selected.list_row");
    // extract all rows if no selected
    if (!rows.length) {
      rows = doc.querySelectorAll("tr.list_row");
    }
    
    if (!rows.length) return { text: "", count: 0 };
  
    const table = rows[0].closest("table");
    let header = "";
    let validColumnIndexes = [];
  
    if (table) {
      const headerRow = table.querySelector("thead tr");
      if (headerRow) {
        const headerCells = Array.from(headerRow.cells);
        headerCells.forEach((cell, index) => {
          if (cell.classList.contains("list_header_cell") && cell.innerText.trim()) {
            validColumnIndexes.push(index);
          }
        });
        const headerCellsText = validColumnIndexes.map(i => {
          const cell = headerCells[i];
          let text = cell.innerText.trim();
          // when sn utils is on, you will see field name in snuwrap
          const snuwrap = cell.querySelector(".snuwrap");
          if (snuwrap) {
            const snuwrapText = snuwrap.innerText.trim();
            if (snuwrapText) {
              // Remove snuwrap text from main text first to avoid double text
              text = text.replace(snuwrapText, "").trim();
              // Append in brackets
              text += ` (${snuwrapText})`;
            }
          }
        
          return text;
        });        
        
        if (useMarkdown) {
          header = "| " + headerCellsText.join(" | ") + " |\n";
          header += "| " + headerCellsText.map(() => "---").join(" | ") + " |";
        } else {
          header = headerCellsText.join("\t");
        }
      }
    }
  
    const bodyText = Array.from(rows).map(row => {
      const cells = Array.from(row.cells);
      const rowValues = validColumnIndexes.map(i => {
        const cell = cells[i];
        if (!cell) return "";
        return cell.innerText.trim();
      });
      return useMarkdown ? `| ${rowValues.join(" | ")} |` : rowValues.join("\t");
    }).join("\n");
  
    const finalText = header ? `${header}\n${bodyText}` : bodyText;
  
    return { text: finalText, count: rows.length };
  }
  
  function tryShadowIframe() {
    // Try macroponent shadow root iframe first
    // macroponent exists in Next Experience UI
    const macro = Array.from(document.querySelectorAll("*"))
      .find(el => el.tagName.toLowerCase().startsWith("macroponent-"));
    if (macro) {
      const shadow = macro.shadowRoot;
      if (shadow) {
        const iframe = shadow.querySelector("iframe");
        if (iframe) {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
          if (iframeDoc) {
            return extractRows(iframeDoc);
          }
        }
      }
    }
  
    // If no shadow iframe, try any iframe on page
    // 'iframe' exists in Pop UI (you can see the menu on left side)
    const iframe = document.querySelector("iframe");
    if (iframe) {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      if (iframeDoc) {
        return extractRows(iframeDoc);
      }
    }
  
    // Fallback to main document
    return { text: "", count: 0 };
  }
  

  const shadowResult = tryShadowIframe();
  if (shadowResult.text) return shadowResult;

  return extractRows(document);
}

function showTemporaryAlert(message, type = "success", duration = 2000) {
  const alertDiv = document.createElement("div");
  alertDiv.textContent = message;
  alertDiv.style.position = "fixed";
  alertDiv.style.top = "20px";
  alertDiv.style.right = "20px";
  alertDiv.style.width = "250px";
  alertDiv.style.boxSizing = "border-box";
  alertDiv.style.color = "white";
  alertDiv.style.padding = "10px 20px";
  alertDiv.style.borderRadius = "5px";
  alertDiv.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";
  alertDiv.style.zIndex = "9999";
  alertDiv.style.fontFamily = "sans-serif";
  alertDiv.style.fontSize = "14px";
  alertDiv.style.lineHeight = "1.4";
  alertDiv.style.textAlign = "center";

  if (type === "success") {
    alertDiv.style.backgroundColor = "#4caf50";
  } else if (type === "error") {
    alertDiv.style.backgroundColor = "#f44336";
  } else {
    alertDiv.style.backgroundColor = "#333";
  }

  document.body.appendChild(alertDiv);

  setTimeout(() => {
    alertDiv.style.transition = "opacity 0.5s ease";
    alertDiv.style.opacity = "0";
    setTimeout(() => {
      alertDiv.remove();
      window.close();
    }, 500);
  }, duration);
}
