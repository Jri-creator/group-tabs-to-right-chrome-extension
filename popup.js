const COLORS = {
  grey: "#5f6368", blue: "#1a73e8", red: "#d93025", yellow: "#f9ab00",
  green: "#188038", pink: "#d01884", purple: "#9334e6", cyan: "#007b83",
  orange: "#e8710a"
};
const NONE = chrome.tabGroups.TAB_GROUP_ID_NONE;

const form = document.getElementById("form");
const msg = document.getElementById("msg");
const nameInput = document.getElementById("name");
const colorBox = document.getElementById("colors");
const newGroupFields = document.getElementById("newGroupFields");
const transferRow = document.getElementById("transferRow");
const transferBox = document.getElementById("transfer");
const transferText = document.getElementById("transferText");
const submitBtn = document.getElementById("submit");

function showMessage(text) {
  msg.textContent = text;
  msg.hidden = false;
}

// Build the colour swatches
Object.entries(COLORS).forEach(([name, hex]) => {
  const input = document.createElement("input");
  input.type = "radio";
  input.name = "color";
  input.id = "c-" + name;
  input.value = name;
  if (name === "blue") input.checked = true;

  const label = document.createElement("label");
  label.htmlFor = input.id;
  label.title = name;
  label.style.background = hex;

  colorBox.append(input, label);
});

(async () => {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const tabs = await chrome.tabs.query({ windowId: activeTab.windowId });
  const right = tabs.filter(t => t.index > activeTab.index && !t.pinned);

  if (!right.length) {
    showMessage("No tabs to the right of this one.");
    return;
  }

  const inGroup = activeTab.groupId !== NONE;

  // Tabs on the right that belong to some OTHER group
  const foreign = right.filter(t => t.groupId !== NONE && t.groupId !== activeTab.groupId);

  // Nothing to decide and already in a group: just pull the tabs in
  if (inGroup && !foreign.length) {
    await chrome.tabs.group({
      tabIds: right.map(t => t.id),
      groupId: activeTab.groupId
    });
    window.close();
    return;
  }

  // Otherwise show the form
  form.hidden = false;
  newGroupFields.hidden = inGroup;
  submitBtn.textContent = inGroup ? "Add tabs" : "Group tabs";

  if (foreign.length) {
    transferRow.hidden = false;
    transferText.textContent = `Transfer grouped tabs to this group (${foreign.length})`;
  }

  if (inGroup) submitBtn.focus(); else nameInput.focus();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.hidden = true;

    const transfer = transferBox.checked;
    const movable = transfer
      ? right
      : right.filter(t => t.groupId === NONE || t.groupId === activeTab.groupId);

    if (!movable.length) {
      showMessage("Only grouped tabs are to the right. Tick the box to move them.");
      return;
    }

    if (inGroup) {
      await chrome.tabs.group({
        tabIds: movable.map(t => t.id),
        groupId: activeTab.groupId
      });
    } else {
      const ids = movable.map(t => t.id);
      if (!activeTab.pinned) ids.unshift(activeTab.id);
      const groupId = await chrome.tabs.group({
        tabIds: ids,
        createProperties: { windowId: activeTab.windowId }
      });
      await chrome.tabGroups.update(groupId, {
        title: nameInput.value.trim(),
        color: form.elements.color.value
      });
    }
    window.close();
  });
})();
