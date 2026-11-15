(() => {
  "use strict";
  const root = document.getElementById("mount-command-lab");
  if (!root) return;
  const $ = selector => root.querySelector(selector);
  const mode = $("#mount-live-mode");
  const file = $("#mount-file-state");
  const step = $("#mount-lab-step");
  const task = $("#mount-lab-task");
  const command = $("#mount-next-command");
  const nextButton = $("[data-lab-next]");
  const terminal = $("#mount-terminal");
  const explanation = $("#mount-reason-result");
  const conclusion = $("#mount-lab-conclusion");
  const resetButton = $("[data-lab-reset]");

  // Three observations. The same command and destination are used in steps 1 and 3.
  // Browser-only simulation: the host machine is never modified.
  const steps = [
    {
      command: "sudo touch /mnt/data/new.txt",
      task: "roで書き込みを試す",
      output: "touch: cannot touch '/mnt/data/new.txt': Read-only file system",
      explanation: "roは書き込み禁止。ファイル作成が拒否されました。"
    },
    {
      command: "sudo mount -o remount,rw /mnt/data",
      task: "接続したままrwへ変更",
      output: "",
      explanation: "remountで設定がro → rwに変化。/dev/sdb1と/mnt/dataの接続はそのままです。",
      changesMode: true
    },
    {
      command: "sudo touch /mnt/data/new.txt",
      task: "同じ書き込みをもう一度試す",
      output: "",
      explanation: "同じtouchが成功しました。変わったのはマウント条件だけです。",
      createsFile: true
    }
  ];
  let index = 0;
  let writable = false;
  let exists = false;

  function render() {
    mode.textContent = writable ? "rw（読み書き可能）" : "ro（読み取り専用）";
    file.textContent = exists ? "new.txt ができた" : "まだない";
    const finished = index === steps.length;
    nextButton.hidden = finished;
    conclusion.hidden = !finished;
    if (finished) {
      step.textContent = "完了";
      task.textContent = "同じ書き込みで、結果が変わる理由を確認";
    } else {
      const current = steps[index];
      step.textContent = (index + 1) + " / " + steps.length;
      task.textContent = current.task;
      command.textContent = current.command;
    }
  }

  nextButton.addEventListener("click", () => {
    if (index >= steps.length) return;
    const current = steps[index];
    if (current.changesMode) writable = true;
    if (current.createsFile) exists = true;
    terminal.textContent = "$ " + current.command + (current.output ? "\n" + current.output : "");
    explanation.textContent = current.explanation;
    index += 1;
    render();
  });

  resetButton.addEventListener("click", () => {
    index = 0;
    writable = false;
    exists = false;
    terminal.textContent = "コマンドを実行すると結果が表示されます。";
    explanation.textContent = "touchは新しいファイルを作るコマンドです。";
    render();
  });

  render();
})();