(() => {
  "use strict";
  const root = document.getElementById("mount-command-lab");
  if (!root) return;
  const $ = selector => root.querySelector(selector);
  const els = {
    mode: $("#mount-live-mode"),
    files: $("#mount-file-state"),
    nextPanel: $("#mount-next-panel"),
    next: $("[data-lab-next]"),
    step: $("#mount-lab-step"),
    task: $("#mount-lab-task"),
    command: $("#mount-next-command"),
    terminal: $("#mount-terminal"),
    meaning: $("#mount-reason-result"),
    conclusion: $("#mount-lab-conclusion"),
    history: $("#mount-history"),
    reset: $("[data-lab-reset]"),
    progress: [...root.querySelectorAll("[data-lab-progress]")],
    milestones: {
      mount: $('[data-learning="mount"]'),
      mode: $('[data-learning="mode"]'),
      remount: $('[data-learning="remount"]')
    },
    milestoneNotes: [
      $("#mount-learning-1"), $("#mount-learning-2"), $("#mount-learning-3")
    ]
  };

  // Simulated environment: /mnt/data directory exists and is initially empty.
  // /dev/sdb1 (ext4) already contains report.txt. Root user can write if rw.
  // Nothing on the host is mounted, read, or written by this JavaScript.
  const steps = [
    {
      command: "ls /mnt/data/report.txt",
      task: "接続前：report.txt は見える？",
      output: "ls: cannot access '/mnt/data/report.txt': No such file or directory",
      meaning: "まだ /dev/sdb1 を接続していないので、そこにある report.txt は /mnt/data から見えません。"
    },
    {
      command: "sudo mount -o ro /dev/sdb1 /mnt/data",
      task: "保存領域を読み取り専用でつなぐ",
      output: "",
      mountMode: "ro",
      meaning: "保存元は /dev/sdb1、接続先は /mnt/data。接続したので report.txt がここから見えるようになります。ファイルはコピーされません。"
    },
    {
      command: "ls /mnt/data/report.txt",
      task: "接続後：同じ場所を確認",
      output: "/mnt/data/report.txt",
      meaning: "接続前は見えなかったファイルが見えました。これが mount の効果＝保存領域を指定のディレクトリにつなぐことです。",
      knowledge: "mount"
    },
    {
      command: "sudo touch /mnt/data/new.txt",
      task: "新しいファイルを作れる？",
      output: "touch: cannot touch '/mnt/data/new.txt': Read-only file system",
      meaning: "touch は新しいファイルの作成を要求しました。しかし ro は書き込み禁止なので、作成は拒否されました。",
      knowledge: "mode"
    },
    {
      command: "sudo mount -o remount,rw /mnt/data",
      task: "接続はそのまま、ro → rw にする",
      output: "",
      mountMode: "rw",
      meaning: "remount は今ある /dev/sdb1 → /mnt/data の接続を変えず、読み書きの条件だけを ro から rw に変更します。"
    },
    {
      command: "sudo touch /mnt/data/new.txt",
      task: "同じ touch をもう一度試す",
      output: "",
      createFile: true,
      meaning: "同じ touch が今度は成功。変えたのはマウント条件だけです。rwになったので、読み取り専用による拒否がなくなりました。",
      knowledge: "remount"
    },
    {
      command: "ls /mnt/data/new.txt",
      task: "実際に新しいファイルができたか確認",
      output: "/mnt/data/new.txt",
      meaning: "new.txt の名前が表示され、ファイル作成を確認できました。mount＝接続、ro/rw＝書き込み条件、remount＝条件変更の3つを区別できます。"
    }
  ];

  let stepIndex = 0;
  let mode = "unmounted";
  let created = false;
  const learned = new Set();
  const history = [];
  const labels = {
    mount: "確認済み：接続後に既存ファイルが見えた",
    mode: "確認済み：roで書き込みが拒否された",
    remount: "確認済み：rwへの変更後、同じ書き込みが成功した"
  };

  function render() {
    els.mode.textContent = mode === "unmounted" ? "未接続" : "接続済み（" + mode + "）";
    els.mode.dataset.mode = mode;
    els.files.textContent = mode === "unmounted" ? "（なし）"
      : created ? "report.txt / new.txt" : "report.txt";
    els.files.dataset.exists = String(created);
    els.progress.forEach((node, i) => {
      node.dataset.state = i < stepIndex ? "completed" : i === stepIndex ? "current" : "pending";
      if (i === stepIndex) node.setAttribute("aria-current", "step");
      else node.removeAttribute("aria-current");
    });
    for (const [key, node] of Object.entries(els.milestones)) {
      node.dataset.earned = String(learned.has(key));
    }
    ["mount", "mode", "remount"].forEach((key, i) => {
      els.milestoneNotes[i].textContent = learned.has(key) ? labels[key] : "未確認";
    });
    const finished = stepIndex >= steps.length;
    els.nextPanel.hidden = finished;
    els.conclusion.hidden = !finished;
    if (!finished) {
      const s = steps[stepIndex];
      els.step.textContent = "STEP " + (stepIndex + 1) + " / " + steps.length;
      els.task.textContent = s.task;
      els.command.textContent = s.command;
    }
    els.history.textContent = history.length ? history.join("\n\n") : "未実行";
  }

  function next() {
    if (stepIndex >= steps.length) return;
    const s = steps[stepIndex];
    if (s.mountMode) mode = s.mountMode;
    if (s.createFile) created = true;
    if (s.knowledge) learned.add(s.knowledge);
    const line = "$ " + s.command + (s.output ? "\n" + s.output : "");
    history.push(line);
    els.terminal.textContent = line;
    els.terminal.dataset.outcome = s.output.startsWith("touch:") || s.output.startsWith("ls:") ? "blocked" : "info";
    els.meaning.textContent = s.meaning;
    stepIndex += 1;
    render();
  }

  function reset() {
    stepIndex = 0;
    mode = "unmounted";
    created = false;
    history.length = 0;
    learned.clear();
    els.terminal.textContent = "コマンドを実行すると結果が表示されます。";
    els.terminal.dataset.outcome = "pending";
    els.meaning.textContent = "まず、接続前にファイルが見えるかを調べます。";
    render();
  }

  els.next.addEventListener("click", next);
  els.reset.addEventListener("click", reset);
  reset();
})();