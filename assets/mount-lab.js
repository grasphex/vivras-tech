(() => {
  "use strict";
  const root = document.getElementById("mount-command-lab");
  if (!root) return;

  const $ = selector => root.querySelector(selector);
  const elements = {
    mode: $("#mount-live-mode"),
    file: $("#mount-file-state"),
    nextPanel: $("#mount-next-panel"),
    next: $("[data-lab-next]"),
    stageNumber: $("#mount-lab-step"),
    stageTask: $("#mount-lab-task"),
    nextCommand: $("#mount-next-command"),
    terminal: $("#mount-terminal"),
    request: $("#mount-reason-request"),
    check: $("#mount-reason-check"),
    result: $("#mount-reason-result"),
    progress: [...root.querySelectorAll("[data-lab-progress]")],
    conclusion: $("#mount-lab-conclusion"),
    history: $("#mount-history"),
    reset: $("[data-lab-reset]")
  };

  // Only the mount option changes between the two identical touch commands.
  const steps = [
    {
      command: "findmnt -no TARGET,OPTIONS /",
      task: "最初に / の状態を調べる",
      request: "既にマウントされている / の設定を表示する",
      check: "表示された options に ro がある",
      result: "今は読み取り専用。まだファイルを作っていない",
      output: "/ ro,relatime"
    },
    {
      command: "sudo touch /vivras-demo.txt",
      task: "ファイルの作成を試す",
      request: "まだ存在しない /vivras-demo.txt を作る",
      check: "/ のマウント条件は ro → 書き込み禁止",
      result: "拒否。ファイルは作られない",
      output: "touch: cannot touch '/vivras-demo.txt': Read-only file system",
      outcome: "blocked"
    },
    {
      command: "sudo mount -o remount,rw /",
      task: "拒否の原因だった条件だけを変える",
      request: "接続済みの / のマウント条件を rw へ変更する",
      check: "remount は接続先やファイルを移動しない",
      result: "/ が ro → rw に変わった。ファイルはまだない",
      output: "",
      setMode: "rw"
    },
    {
      command: "sudo touch /vivras-demo.txt",
      task: "まったく同じ touch をもう一度実行",
      request: "手順2と同じ /vivras-demo.txt を作る",
      check: "/ のマウント条件は rw → 読み取り専用制限なし",
      result: "作成成功。ファイルが存在するようになった",
      output: "",
      outcome: "created",
      createFile: true
    },
    {
      command: "ls /vivras-demo.txt",
      task: "本当にファイルができたか調べる",
      request: "ファイルが存在するかを確認する",
      check: "手順4で touch の作成が成功した",
      result: "名前が表示されたので、ファイルが存在する",
      output: "/vivras-demo.txt"
    }
  ];

  let nextStep = 0;
  let mountMode = "ro";
  let fileExists = false;
  const history = [];

  function render() {
    elements.mode.textContent = mountMode === "ro" ? "ro：読み取り専用" : "rw：読み書き可能";
    elements.mode.dataset.mode = mountMode;
    elements.file.textContent = fileExists ? "作成済み" : "存在しない";
    elements.file.dataset.exists = String(fileExists);
    elements.progress.forEach((item, index) => {
      const completed = index < nextStep;
      const active = index === nextStep;
      item.dataset.state = completed ? "completed" : active ? "current" : "pending";
      if (active) item.setAttribute("aria-current", "step");
      else item.removeAttribute("aria-current");
    });

    const finished = nextStep >= steps.length;
    elements.nextPanel.hidden = finished;
    elements.conclusion.hidden = !finished;
    if (!finished) {
      const step = steps[nextStep];
      elements.stageNumber.textContent = "STEP " + (nextStep + 1) + " / " + steps.length;
      elements.stageTask.textContent = step.task;
      elements.nextCommand.textContent = step.command;
    }
    elements.history.textContent = history.length ? history.join("\n\n") : "まだ履歴はありません。";
  }

  function executeNext() {
    if (nextStep >= steps.length) return;
    const step = steps[nextStep];
    // Pure simulated state transition: never execute commands on the host OS.
    if (step.setMode) mountMode = step.setMode;
    if (step.createFile) fileExists = true;

    const display = "$ " + step.command + (step.output ? "\n" + step.output : "");
    history.push(display);
    elements.terminal.textContent = display;
    elements.terminal.dataset.outcome = step.outcome || "info";
    elements.request.textContent = step.request;
    elements.check.textContent = step.check;
    elements.result.textContent = step.result;
    nextStep += 1;
    render();
  }

  function reset() {
    nextStep = 0;
    mountMode = "ro";
    fileExists = false;
    history.length = 0;
    elements.terminal.textContent = "ここにコマンドの結果が表示されます。";
    elements.terminal.dataset.outcome = "pending";
    elements.request.textContent = "まだ実行していません";
    elements.check.textContent = "—";
    elements.result.textContent = "—";
    render();
  }

  elements.next.addEventListener("click", executeNext);
  elements.reset.addEventListener("click", reset);
  reset();
})();