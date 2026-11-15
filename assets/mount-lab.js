(() => {
  "use strict";
  const root = document.getElementById("mount-command-lab");
  if (!root) return;

  const buttons = [...root.querySelectorAll("button[data-lab-command]")];
  const reset = root.querySelector("[data-lab-reset]");
  const consoleBox = root.querySelector("#mount-terminal");
  const modeBadge = root.querySelector("#mount-live-mode");
  const modeMessage = root.querySelector("#mount-mode-message");
  const lastResult = root.querySelector("#mount-last-result");
  const roResult = root.querySelector("#mount-ro-write");
  const rwResult = root.querySelector("#mount-rw-write");
  const lesson = root.querySelector("#mount-learned");
  const commandMap = Object.freeze({
    inspect: "findmnt -no TARGET,OPTIONS /",
    write: "sudo touch /vivras-demo.txt",
    remountrw: "sudo mount -o remount,rw /",
    remountro: "sudo mount -o remount,ro /",
    read: "cat /etc/hostname"
  });
  let state;
  const transcript = [];

  function updateView() {
    const isWritable = state.mode === "rw";
    modeBadge.textContent = isWritable ? "rw：読み書き可能" : "ro：読み取り専用";
    modeBadge.dataset.mode = state.mode;
    modeMessage.textContent = isWritable
      ? "マウントの条件はrwです。通常は書き込みも可能です。"
      : "マウントの条件はroです。ファイルの読み取りはできても、書き込みは禁止です。";
    lastResult.textContent = state.last;
    roResult.textContent = state.roAttempted ? "失敗（Read-only file system）" : "未実行";
    rwResult.textContent = state.rwAttempted ? "成功（ファイル作成／更新）" : "未実行";
    lesson.textContent = state.roAttempted && state.rwAttempted
      ? "同じ touch コマンドでも、remountでroからrwに変えると、書き込みの結果が変わる。接続先「/」やファイルのパスは変えていません。"
      : "試してみよう：①roでtouchを実行 → ②remount,rw → ③同じtouchを再実行。";
    consoleBox.textContent = transcript.length ? transcript.join("\n\n") : "仮想Linuxの準備完了。上のコマンドを選んで実行してください。";
  }

  function execute(key) {
    const command = commandMap[key];
    if (!command) return;
    let output = "";
    switch (key) {
      case "inspect":
        output = "/ " + state.mode + ",relatime\n# findmntは現在のマウント条件を表示";
        state.last = "マウント状態を確認";
        break;
      case "read":
        output = "vivras-demo-host\n# 読み取り成功（roでもrwでも可能）";
        state.last = "読み取り成功";
        break;
      case "write":
        if (state.mode === "ro") {
          output = "touch: cannot touch '/vivras-demo.txt': Read-only file system\n# 終了コード 1：書き込み失敗";
          state.roAttempted = true;
          state.last = "書き込み失敗：読み取り専用";
        } else {
          output = "# 終了コード 0：書き込み成功（touch自体は通常、何も出力しない）";
          state.fileCreated = true;
          state.rwAttempted = true;
          state.last = "書き込み成功：rwで許可";
        }
        break;
      case "remountrw":
        state.mode = "rw";
        output = "# 正常終了：通常は出力なし\n# 仮想環境で / のマウント条件が rw に変わった";
        state.last = "remount成功：ro → rw";
        break;
      case "remountro":
        state.mode = "ro";
        output = "# 正常終了：通常は出力なし\n# 仮想環境で / のマウント条件が ro に変わった";
        state.last = "remount成功：rw → ro";
        break;
    }
    transcript.push("$ " + command + "\n" + output);
    if (transcript.length > 14) transcript.splice(0, transcript.length - 14);
    updateView();
    consoleBox.scrollTop = consoleBox.scrollHeight;
  }

  function restart() {
    state = {
      mode: "ro",
      fileCreated: false,
      roAttempted: false,
      rwAttempted: false,
      last: "まだコマンドを実行していません"
    };
    transcript.length = 0;
    updateView();
  }

  buttons.forEach(button => {
    button.addEventListener("click", () => execute(button.dataset.labCommand));
  });
  reset.addEventListener("click", restart);
  restart();
})();