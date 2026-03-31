import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { 
  getAuth, 
  onAuthStateChanged, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
          import { getDatabase, ref, push, update, remove, onValue } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";
          import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-storage.js";
          import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

          const firebaseConfig = {
            apiKey: "AIzaSyDu_F4ue04mfJSQePdnHAU7AXloqwmhSbE",
            authDomain: "jobde-bfdd8.firebaseapp.com",
            projectId: "jobde-bfdd8",
            storageBucket: "jobde-bfdd8.appspot.com",
            messagingSenderId: "509145691108",
            appId: "1:509145691108:web:6a403f9d0792b9ff060df1",
            databaseURL: "https://jobde-bfdd8-default-rtdb.asia-southeast1.firebasedatabase.app/"
          };

          const app = initializeApp(firebaseConfig);
          const auth = getAuth(app);
          const db = getDatabase(app);
          const storage = getStorage(app);
        const usernameToEmail = (username) => {
    return username.toLowerCase().trim() + "@app.local";
};

const showAuthError = (message) => {
    const el = document.getElementById('authError');
    el.innerText = message;
    el.classList.remove('hidden');
};

const hideAuthError = () => {
    document.getElementById('authError').classList.add('hidden');
};

          // ============================
          // Supabase Storage (completion proofs)
          // ============================
          // TODO: isi dengan kredensial Supabase kamu.
          const SUPABASE_URL = "https://jcgesqargwkykjerdhpk.supabase.co";
          const SUPABASE_ANON_KEY = "sb_publishable_nKg59ahzR8vSl8zDKqi2sA_7zNc2qQx";
          const SUPABASE_STORAGE_BUCKET = "task-proofs";

          const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY) ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
          let supabaseUser = null;

          const ensureSupabaseSession = async () => {
    if (!supabase) {
        console.error("Supabase belum di-setup!");
        return null;
    }

    try {
        // 1. cek session aktif
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
            console.error("Supabase getSession error:", sessionError);
        }

        if (sessionData?.session?.user) {
            supabaseUser = sessionData.session.user;
            return supabaseUser;
        }

        // 2. buat akun palsu per username
        const handle = localStorage.getItem('tm_handle') || 'guest';
        const fakeEmail = handle.toLowerCase().trim() + "@app.local";
        const password = "12345678";

        // 3. coba login dulu
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
            email: fakeEmail,
            password: password
        });

        if (!loginError && loginData?.user) {
            supabaseUser = loginData.user;
            return supabaseUser;
        }

        console.warn("Supabase login gagal, coba signup:", loginError?.message);

        // 4. kalau gagal login, coba daftar
        const { error: signUpError } = await supabase.auth.signUp({
            email: fakeEmail,
            password: password
        });

        // 5. kalau error selain "already registered", hentikan
        if (signUpError && !signUpError.message.toLowerCase().includes("already")) {
            console.error("Supabase signup error:", signUpError);
            return null;
        }

        // 6. login ulang
        const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
            email: fakeEmail,
            password: password
        });

        if (retryError || !retryData?.user) {
            console.error("Supabase login retry error:", retryError);
            return null;
        }

        supabaseUser = retryData.user;
        return supabaseUser;

    } catch (err) {
        console.error("SESSION ERROR:", err);
        return null;
    }
};
            

          let allTasks = [];
          let catFilter = 'All';
          let statusFilter = 'All';
          let unsubscribeTasks = null;
          let currentUser = null;

          // State untuk manajemen gambar bukti sebelum upload (preview + hapus/ganti).
          const MAX_COMPLETION_IMAGES = 7;
          const MAX_COMPLETION_FILE_BYTES = 5 * 1024 * 1024; // 5 MB (per file)
          let completionSelectedFiles = [];
          let completionPreviewRenderId = 0;
          let completionReplaceIndex = null;

          // Prevent XSS by escaping user-provided strings before injecting into HTML.
          const escapeHtml = (value) => {
              const str = value === null || value === undefined ? '' : String(value);
              return str.replace(/[&<>"']/g, (ch) => {
                  switch (ch) {
                      case '&': return '&amp;';
                      case '<': return '&lt;';
                      case '>': return '&gt;';
                      case '"': return '&quot;';
                      case "'": return '&#039;';
                      default: return ch;
                  }
              });
          };
        
        let authMode = "login"; // login | register

const tabLogin = document.getElementById('tabLogin');
const tabRegister = document.getElementById('tabRegister');
const registerEmailWrap = document.getElementById('registerEmailWrap');
const authSubmitBtn = document.getElementById('authSubmitBtn');

const setAuthMode = (mode) => {
    authMode = mode;

    if (mode === "login") {
        tabLogin.classList.add('bg-blue-600', 'text-white');
        tabLogin.classList.remove('text-slate-500');

        tabRegister.classList.remove('bg-blue-600', 'text-white');
        tabRegister.classList.add('text-slate-500');

        registerEmailWrap.classList.add('hidden');
        authSubmitBtn.innerText = "Login";
        document.getElementById('authEmail').removeAttribute('required');
    } else {
        tabRegister.classList.add('bg-blue-600', 'text-white');
        tabRegister.classList.remove('text-slate-500');

        tabLogin.classList.remove('bg-blue-600', 'text-white');
        tabLogin.classList.add('text-slate-500');

        registerEmailWrap.classList.remove('hidden');
        authSubmitBtn.innerText = "Daftar";
        document.getElementById('authEmail').setAttribute('required', 'required');
    }

    hideAuthError();
};

tabLogin.onclick = () => setAuthMode("login");
tabRegister.onclick = () => setAuthMode("register");

// default mode
setAuthMode("login");

          onAuthStateChanged(auth, async (user) => {
              const handle = localStorage.getItem('tm_handle');
              setTimeout(() => document.getElementById('loadingOverlay').classList.add('hidden'), 1500);

              if (user && handle) {
                  currentUser = user;
                  document.getElementById('authScreen').classList.add('hidden');
                  document.getElementById('mainApp').classList.remove('hidden');
                  document.getElementById('usernameDisplay').innerText = handle;

                  // Pastikan session Supabase aktif untuk akses Storage (RLS).
                  try {
                      await ensureSupabaseSession();
                  } catch (e) {
                      console.error("Supabase session init gagal:", e);
                  }

                  startDataSync();
              } else {
                  document.getElementById('authScreen').classList.remove('hidden');
                  document.getElementById('mainApp').classList.add('hidden');
              }
          });

          document.getElementById('authForm').onsubmit = async (e) => {
    e.preventDefault();

    const username = document.getElementById('authUsername').value.trim();
    const password = document.getElementById('authPassword').value;
    const realEmail = document.getElementById('authEmail').value.trim();
    const btn = document.getElementById('authSubmitBtn');

    if (!username || !password) {
        showAuthError("Username dan password wajib diisi.");
        return;
    }

    if (authMode === "register" && !realEmail) {
        showAuthError("Email wajib diisi untuk pendaftaran.");
        return;
    }

    const email = usernameToEmail(username);

    try {
        hideAuthError();
        btn.disabled = true;
        btn.innerText = authMode === "login" ? "Masuk..." : "Mendaftarkan...";

        let userCredential;

        if (authMode === "login") {
            userCredential = await signInWithEmailAndPassword(auth, email, password);
        } else {
            userCredential = await createUserWithEmailAndPassword(auth, email, password);

            // Simpan info tambahan user ke Realtime Database
            const usernameKey = username.toLowerCase().trim();
            const userProfileRef = ref(db, `users/${usernameKey}/profile`);

            await update(userProfileRef, {
                username: username,
                emailAlias: email,
                realEmail: realEmail,
                createdAt: Date.now()
            });
        }

        localStorage.setItem('tm_handle', username);
        localStorage.setItem('tm_email', email);

        currentUser = userCredential.user;

        document.getElementById('authScreen').classList.add('hidden');
        document.getElementById('mainApp').classList.remove('hidden');
        document.getElementById('usernameDisplay').innerText = username;

        try {
            await ensureSupabaseSession();
        } catch (e) {
            console.error("Supabase session init gagal:", e);
        }

        startDataSync();

    } catch (error) {
        console.error(authMode === "login" ? "Login error:" : "Register error:", error);

        if (error.code === "auth/email-already-in-use") {
            showAuthError("Username sudah dipakai.");
        } else if (error.code === "auth/invalid-credential") {
            showAuthError("Username atau password salah.");
        } else if (error.code === "auth/user-not-found") {
            showAuthError("User tidak terdaftar.");
        } else if (error.code === "auth/wrong-password") {
            showAuthError("Password salah.");
        } else if (error.code === "auth/weak-password") {
            showAuthError("Password terlalu lemah. Minimal 6 karakter.");
        } else if (error.code === "auth/too-many-requests") {
            showAuthError("Terlalu banyak percobaan. Coba lagi nanti.");
        } else {
            showAuthError("Gagal: " + error.message);
        }
    } finally {
        btn.disabled = false;
        btn.innerText = authMode === "login" ? "Login" : "Daftar";
    }
};

          const startDataSync = () => {
              const handle = localStorage.getItem('tm_handle');
              if (!handle) return;

              const username = handle.toLowerCase().trim();
              const tasksRef = ref(db, `users/${username}/tasks`);

              if (unsubscribeTasks) unsubscribeTasks();

              unsubscribeTasks = onValue(tasksRef, (snapshot) => {
                  const data = snapshot.val() || {};
                  allTasks = Object.keys(data).map(id => ({ id, ...data[id] }));
                  render();
              }, (error) => {
                  console.error("Sync Error:", error);
              });
          };

          window.render = () => {
              const search = document.getElementById('searchInput').value.toLowerCase();

              const filtered = allTasks.filter(t => {
                  const mCat = catFilter === 'All' || t.category === catFilter;
                  const mStatus = statusFilter === 'All' || t.status === statusFilter;
                  const title = (t.title || '').toString();
                  const desc = (t.description || '').toString();
                  const mSearch = title.toLowerCase().includes(search) || desc.toLowerCase().includes(search);
                  return mCat && mStatus && mSearch;
              });

              const done = allTasks.filter(t => t.status === 'Completed').length;
              const total = allTasks.length;
              const percent = total === 0 ? 0 : Math.round((done / total) * 100);

              document.getElementById('statTotal').innerText = total;
              document.getElementById('statDone').innerText = done;
              document.getElementById('statPending').innerText = total - done;
              document.getElementById('progressPercent').innerText = percent + "%";
              document.getElementById('progressBar').style.width = percent + "%";

              const container = document.getElementById('taskList');
              if (filtered.length === 0) {
                  container.innerHTML = `
                      <div class="py-20 flex flex-col items-center justify-center opacity-40">
                          <svg class="w-20 h-20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                          <p class="font-black">Tidak ada tugas ditemukan</p>
                      </div>`;
                  return;
              }

              container.innerHTML = filtered.map((t, i) => {
                  const isDone = t.status === 'Completed';
                  const prioColor = t.priority === 'High' ? 'bg-red-500' : t.priority === 'Medium' ? 'bg-orange-500' : 'bg-green-500';
                  const deadlineDate = t.deadline ? new Date(t.deadline).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Kapan saja';
                  const completedDate = t.completedAt ? new Date(t.completedAt).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : null;
                  const title = (t.title || '').toString();
                  const description = (t.description || '').toString();
                  const category = (t.category || '').toString();
                  const priority = (t.priority || '').toString();

                  return `
                      <div onclick="openTaskPreview('${t.id}')" class="task-card cursor-pointer p-7 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center gap-6 animate-fade-in" style="animation-delay: ${i * 0.05}s">
                          <div class="flex items-center gap-5 flex-1 w-full">
                              <button onclick="event.stopPropagation(); handleTaskStatus('${t.id}', '${t.status}')" class="group relative w-10 h-10 rounded-2xl border-2 flex items-center justify-center transition-all ${isDone ? 'bg-green-500 border-green-500 text-white' : 'border-slate-200 dark:border-slate-700 hover:border-blue-500'}">
                                  ${isDone ? '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>' : '<div class="w-2 h-2 rounded-full bg-slate-200 group-hover:bg-blue-500"></div>'}
                              </button>
                              <div class="flex-1 min-w-0">
                                  <div class="flex items-center gap-3 mb-2">
                                      <div class="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[9px] font-black uppercase text-slate-500">
                                          <div class="w-1.5 h-1.5 rounded-full ${prioColor}"></div>
                                          ${escapeHtml(priority)}
                                      </div>
                                      <span class="text-[9px] font-black text-blue-500 uppercase tracking-widest">${escapeHtml(category)}</span>
                                  </div>
                                  <h3 class="text-lg font-black tracking-tight leading-tight ${isDone ? 'line-through text-slate-400' : ''}">${escapeHtml(title)}</h3>
                                  ${description ? `<p class="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium line-clamp-2">${escapeHtml(description)}</p>` : ''}
<p class="text-[10px] text-blue-500 font-bold mt-3 uppercase tracking-widest">Klik untuk lihat detail</p>
                              </div>
                          </div>
                          <div class="flex items-center justify-between md:justify-end gap-8 w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                              <div class="text-right">
                                  <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Tenggat</p>
                                  <p class="text-xs font-bold text-slate-700 dark:text-slate-300">${deadlineDate}</p>
                                  ${isDone && completedDate ? `
                                      <div class="text-right mt-3">
                                          <p class="text-[9px] font-black text-green-500 uppercase tracking-widest mb-1">Submit</p>
                                          <p class="text-xs font-bold text-green-600">${completedDate}</p>
                                      </div>
                                  ` : ''}
                              </div>
                              <div class="flex items-center gap-2">
                                  <button onclick="event.stopPropagation(); openEdit('${t.id}')" class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-all">
                                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                  </button>
                                  <button onclick="event.stopPropagation(); deleteTask('${t.id}')" class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
                                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                  </button>
                              </div>
                          </div>
                      </div>`;
              }).join('');
          };

          window.setStatusFilter = (status) => {
              statusFilter = status;
              document.querySelectorAll('.status-filter').forEach(b => {
                  b.classList.remove('bg-blue-600', 'text-white');
                  b.classList.add('text-slate-500');
              });
              document.getElementById('filter' + status).classList.add('bg-blue-600', 'text-white');
              document.getElementById('filter' + status).classList.remove('text-slate-500');
              render();
          };

          window.toggleStatus = async (id, current) => {
              const handle = localStorage.getItem('tm_handle');
              if (!handle) return;

              const username = handle.toLowerCase().trim();
              const taskRef = ref(db, `users/${username}/tasks/${id}`);

              await update(taskRef, { 
                  status: current === 'Completed' ? 'Pending' : 'Completed' 
              });
          };

          window.handleTaskStatus = async (id, current) => {
              if (current === 'Completed') {
                  const username = localStorage.getItem('tm_handle')?.toLowerCase()?.trim();
                  if (!username) return;
                  const taskRef = ref(db, `users/${username}/tasks/${id}`);
                  await update(taskRef, {
                      status: 'Pending',
                      completedAt: null,
                      completionProofs: null
                  });
                  return;
              }

              document.getElementById('completeTaskId').value = id;
              document.getElementById('completeDate').value = new Date().toISOString().slice(0,16);
              document.getElementById('completeImages').value = '';
              document.getElementById('completeReplaceImage').value = '';
              document.getElementById('completePreview').innerHTML = '';
              document.getElementById('completeDriveUrl').value = '';
              completionPreviewRenderId++;
              completionSelectedFiles = [];
              completionReplaceIndex = null;
              document.getElementById('completeModal').classList.remove('hidden');
          };

          window.deleteTask = async (id) => {
              if (confirm("Hapus tugas ini secara permanen?")) {
                  const username = localStorage.getItem('tm_handle')?.toLowerCase()?.trim();
                  const taskRef = ref(db, 'users/' + username + '/tasks/' + id);
                  await remove(taskRef);
              }
          };

          window.openEdit = (id) => {
              const t = allTasks.find(x => x.id === id);
              if (!t) return;
              document.getElementById('editId').value = t.id;
              document.getElementById('taskTitle').value = t.title;
              document.getElementById('taskCategory').value = t.category;
              document.getElementById('taskPriority').value = t.priority;
              document.getElementById('taskDeadline').value = t.deadline || '';
              document.getElementById('taskDesc').value = t.description || '';
              document.getElementById('taskStorageLink').value = t.storageLink || '';
              document.getElementById('modalHeading').innerText = "Edit Tugas";
              document.getElementById('modalTask').classList.remove('hidden');
          };
        
        window.openTaskPreview = async (id) => {
    const task = allTasks.find(t => t.id === id);
    if (!task) return;

    const priority = task.priority || 'Medium';
    const status = task.status || 'Pending';
    const category = task.category || 'Personal';
    const title = task.title || 'Tanpa Judul';
    const description = task.description || 'Tidak ada catatan.';
    const storageLink = task.storageLink || '';

    const deadline = task.deadline
        ? new Date(task.deadline).toLocaleString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
        : 'tidak ada';

    const completedAt = task.completedAt
        ? new Date(task.completedAt).toLocaleString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }) + ' WIB'
        : '-';

    document.getElementById('previewTitle').innerText = title;
    document.getElementById('previewCategory').innerText = category;
    document.getElementById('previewStatus').innerText = status === 'Completed' ? 'Selesai' : 'Belum Selesai';
    document.getElementById('previewDeadline').innerText = deadline;
    document.getElementById('previewCompletedAt').innerText = completedAt;
    document.getElementById('previewDescription').innerText = description;

    const priorityBadge = document.getElementById('previewPriorityBadge');
    priorityBadge.innerText = priority;
    priorityBadge.className = 'px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-white';

    if (priority === 'High') {
        priorityBadge.classList.add('bg-red-500');
    } else if (priority === 'Medium') {
        priorityBadge.classList.add('bg-orange-500');
    } else {
        priorityBadge.classList.add('bg-green-500');
    }

    const previewStorageWrap = document.getElementById('previewStorageWrap');
    const previewStorageLink = document.getElementById('previewStorageLink');

    if (storageLink) {
        previewStorageWrap.classList.remove('hidden');
        previewStorageLink.href = storageLink;
        previewStorageLink.innerText = storageLink;
    } else {
        previewStorageWrap.classList.add('hidden');
        previewStorageLink.href = '#';
        previewStorageLink.innerText = '';
    }

    const proofSection = document.getElementById('previewProofSection');
    const proofGrid = document.getElementById('previewProofGrid');
    const proofs = Array.isArray(task.completionProofs) ? task.completionProofs : [];
    const signedUrlTtlSeconds = 60 * 60;

    if (proofs.length > 0) {
        proofSection.classList.remove('hidden');

        const proofHtml = (await Promise.all(proofs.map(async (proof) => {
            let imgUrl = proof.url || '';

            if (!imgUrl && proof.path && supabase) {
                await ensureSupabaseSession();

                const { data, error } = await supabase.storage
                    .from(SUPABASE_STORAGE_BUCKET)
                    .createSignedUrl(proof.path, signedUrlTtlSeconds);

                if (!error && data?.signedUrl) {
                    imgUrl = data.signedUrl;
                }
            }

            if (!imgUrl) return null;

            return `
                <a href="${escapeHtml(imgUrl)}" target="_blank" rel="noopener noreferrer"
                   class="block rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 hover:scale-[1.02] transition-all">
                    <img src="${escapeHtml(imgUrl)}" class="w-full h-40 object-cover" alt="Bukti tugas">
                </a>
            `;
        }))).filter(Boolean);

        proofGrid.innerHTML = proofHtml.join('');
    } else {
        proofSection.classList.add('hidden');
        proofGrid.innerHTML = '';
    }

    document.getElementById('previewEditBtn').onclick = () => {
        closeTaskPreview();
        openEdit(id);
    };

    document.getElementById('previewDeleteBtn').onclick = () => {
        closeTaskPreview();
        deleteTask(id);
    };

    document.getElementById('taskPreviewModal').classList.remove('hidden');
};

window.closeTaskPreview = () => {
    document.getElementById('taskPreviewModal').classList.add('hidden');
};

          document.getElementById('taskForm').onsubmit = async (e) => {
              e.preventDefault();
              const id = document.getElementById('editId').value;
              const username = localStorage.getItem('tm_handle')?.toLowerCase();

              if (!username) {
                  alert("Sesi berakhir, silakan login kembali.");
                  return;
              }

              const data = {
    title: document.getElementById('taskTitle').value.trim(),
    category: document.getElementById('taskCategory').value,
    priority: document.getElementById('taskPriority').value,
    deadline: document.getElementById('taskDeadline').value,
    description: document.getElementById('taskDesc').value.trim(),
    storageLink: document.getElementById('taskStorageLink').value.trim(),
    updatedAt: Date.now()
};

              try {
                  if (id) {
                      const taskRef = ref(db, `users/${username}/tasks/${id}`);
                      await update(taskRef, data);
                  } else {
                      const tasksRef = ref(db, `users/${username}/tasks`);
                      await push(tasksRef, {
                          ...data,
                          status: 'Pending',
                          createdAt: Date.now()
                      });
                  }
                  closeModal();
              } catch (err) {
                  console.error("Gagal menyimpan tugas:", err);
                  alert("Gagal menyimpan data ke server.");
              }
          };
        
        window.closeModal = () => {
    document.getElementById('modalTask').classList.add('hidden');
    document.getElementById('taskForm').reset();
    document.getElementById('editId').value = '';
    document.getElementById('modalHeading').innerText = 'Buat Tugas';
};
        
        window.closeCompleteModal = () => {
    document.getElementById('completeModal').classList.add('hidden');
    document.getElementById('completeImages').value = '';
    document.getElementById('completeReplaceImage').value = '';
    document.getElementById('completePreview').innerHTML = '';
    document.getElementById('completeDriveUrl').value = '';
    completionSelectedFiles = [];
    completionReplaceIndex = null;
    completionPreviewRenderId++;
};

          const completeImagesInput = document.getElementById('completeImages');
          const completeReplaceInput = document.getElementById('completeReplaceImage');
          const completePreview = document.getElementById('completePreview');

          const syncCompletionFilesToInput = () => {
              const dt = new DataTransfer();
              completionSelectedFiles.forEach((file) => dt.items.add(file));
              completeImagesInput.files = dt.files;
          };

          const readFileAsDataURL = (file) => {
              return new Promise((resolve) => {
                  const reader = new FileReader();
                  reader.onload = (ev) => resolve(ev.target.result);
                  reader.onerror = () => resolve('');
                  reader.readAsDataURL(file);
              });
          };

          const renderCompletionPreview = async () => {
              const gen = ++completionPreviewRenderId;
              const files = completionSelectedFiles;

              if (!files.length) {
                  completePreview.innerHTML = '';
                  return;
              }

              const urls = await Promise.all(files.map(readFileAsDataURL));
              if (gen !== completionPreviewRenderId) return;

              completePreview.innerHTML = urls.map((url, i) => `
                  <div class="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 relative">
                      <img src="${url}" class="w-full h-32 object-cover">
                      <div class="absolute top-2 right-2 flex gap-2">
                          <button type="button"
                              class="p-2 rounded-xl bg-white/90 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 transition-all"
                              data-completion-action="replace" data-completion-index="${i}"
                              title="Ganti gambar">
                              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 3h5v5M21 3l-10 10"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 21a2 2 0 01-2-2V6a2 2 0 012-2h8"/></svg>
                          </button>
                          <button type="button"
                              class="p-2 rounded-xl bg-white/90 dark:bg-slate-900/60 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-all"
                              data-completion-action="delete" data-completion-index="${i}"
                              title="Hapus gambar">
                              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16"/></svg>
                          </button>
                      </div>
                      <div class="absolute bottom-2 left-2 right-2 bg-black/40 text-white text-[10px] font-bold px-2 py-1 rounded-xl truncate">
                          ${escapeHtml(files[i]?.name || '')}
                      </div>
                  </div>
              `).join('');
          };

          completePreview.addEventListener('click', (e) => {
              const btn = e.target.closest('button[data-completion-action]');
              if (!btn) return;

              const action = btn.dataset.completionAction;
              const index = Number(btn.dataset.completionIndex);
              if (Number.isNaN(index)) return;

              if (action === 'delete') {
                  completionSelectedFiles.splice(index, 1);
                  completionReplaceIndex = null;
                  syncCompletionFilesToInput();
                  renderCompletionPreview();
                  return;
              }

              if (action === 'replace') {
                  completionReplaceIndex = index;
                  completeReplaceInput.value = '';
                  completeReplaceInput.click();
              }
          });

          completeReplaceInput.addEventListener('change', (e) => {
              const file = e.target.files?.[0];
              if (!file) return;

              if (file.size > MAX_COMPLETION_FILE_BYTES) {
                  alert(`File "${file.name}" melebihi batas 5 MB. Silakan pilih file yang lebih kecil.`);
                  completeReplaceInput.value = '';
                  return;
              }

              if (completionReplaceIndex === null || completionReplaceIndex === undefined) return;
              if (!completionSelectedFiles.length) return;

              completionSelectedFiles[completionReplaceIndex] = file;
              completionReplaceIndex = null;

              syncCompletionFilesToInput();
              renderCompletionPreview();

              completeReplaceInput.value = '';
          });

          completeImagesInput.addEventListener('change', (e) => {
              const newFiles = Array.from(e.target.files || []);
              if (!newFiles.length) return;

              const oversized = newFiles.find(f => f.size > MAX_COMPLETION_FILE_BYTES);
              if (oversized) {
                  alert(`File "${oversized.name}" melebihi batas 5 MB. Silakan pilih file yang lebih kecil.`);
                  e.target.value = '';
                  return;
              }

              const combined = completionSelectedFiles.concat(newFiles);
              if (combined.length > MAX_COMPLETION_IMAGES) {
                  alert(`Maksimal ${MAX_COMPLETION_IMAGES} gambar.`);
                  e.target.value = '';
                  return;
              }

              completionSelectedFiles = combined;
              syncCompletionFilesToInput();
              renderCompletionPreview();

              // allow selecting the same file(s) again
              e.target.value = '';
          });

          document.getElementById('completeForm').onsubmit = async (e) => {
              e.preventDefault();

              const taskId = document.getElementById('completeTaskId').value;
              const files = completionSelectedFiles;
              const submitDate = document.getElementById('completeDate').value;
            const driveUrl = document.getElementById('completeDriveUrl').value.trim();
              const btn = document.getElementById('completeSubmitBtn');
              const username = localStorage.getItem('tm_handle')?.toLowerCase()?.trim();

              if (!username || !taskId) {
                  alert("Data tugas tidak valid.");
                  return;
              }

              if (files.length < 1) {
                  alert("Minimal upload 1 gambar.");
                  return;
              }

              if (files.length > MAX_COMPLETION_IMAGES) {
                  alert(`Maksimal ${MAX_COMPLETION_IMAGES} gambar.`);
                  return;
              }

              const oversized = files.find(f => f.size > MAX_COMPLETION_FILE_BYTES);
              if (oversized) {
                  alert(`File "${oversized.name}" melebihi batas 5 MB. Silakan pilih file yang lebih kecil.`);
                  return;
              }

              try {
                  btn.disabled = true;
                  btn.innerText = "Mengupload...";

                  const uploadedImages = [];

                  const sessionUser = await ensureSupabaseSession();
const ownerUserId = sessionUser?.id;
                console.log("SUPABASE SESSION USER:", sessionUser);

if (!supabase) {
    alert("Supabase belum terhubung.");
    return;
}

if (!ownerUserId) {
    console.error("Supabase user tidak ditemukan.");
    alert("Session upload belum siap. Coba logout lalu login lagi.");
    return;
}

                  for (const file of files) {
                      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}_${file.name}`;
                      const filePath = `${ownerUserId}/${taskId}/${fileName}`;

                      const { error: uploadErr } = await supabase.storage
                          .from(SUPABASE_STORAGE_BUCKET)
                          .upload(filePath, file, {
                              contentType: file.type || 'application/octet-stream',
                              upsert: false
                          });

                      if (uploadErr) throw uploadErr;

                      uploadedImages.push({
                          name: file.name,
                          path: filePath
                      });
                  }

                  const taskRef = ref(db, `users/${username}/tasks/${taskId}`);

                  await update(taskRef, {
    status: 'Completed',
    completedAt: submitDate || new Date().toISOString(),
    completionProofs: uploadedImages,
    driveUrl: driveUrl || null
});

                  closeCompleteModal();
              } catch (err) {
                  console.error("Gagal menyelesaikan tugas:", err);
                  alert(err?.message ? err.message : "Gagal upload bukti tugas.");
              } finally {
                  btn.disabled = false;
                  btn.innerText = "Upload & Selesaikan Tugas";
              }
          };

         

          window.closeCompleteModal = () => {
              document.getElementById('completeModal').classList.add('hidden');
              document.getElementById('completeForm').reset();
              document.getElementById('completePreview').innerHTML = '';
              document.getElementById('completeTaskId').value = '';
              document.getElementById('completeImages').value = '';
              document.getElementById('completeReplaceImage').value = '';
              completionPreviewRenderId++;
              completionSelectedFiles = [];
              completionReplaceIndex = null;
          };

          window.closeGalleryModal = () => {
              document.getElementById('galleryModal').classList.add('hidden');
          };

          const renderGallery = async () => {
              const grid = document.getElementById('galleryGrid');
              const empty = document.getElementById('galleryEmptyState');
              const signedUrlTtlSeconds = 60 * 60; // 1 jam

              const completedTasks = allTasks.filter(t => t.status === 'Completed');
              const items = completedTasks
                  .flatMap((t) => {
                      const proofs = Array.isArray(t.completionProofs) ? t.completionProofs : [];
                      return proofs.map((p) => ({
                          url: p?.url,
                          path: p?.path,
                          name: p?.name,
                          taskTitle: t.title || '',
                          taskId: t.id
                      }));
                  })
                  .filter((x) => !!x.url || !!x.path);

              if (!items.length) {
                  grid.innerHTML = '';
                  empty.classList.remove('hidden');
                  return;
              }

              empty.classList.add('hidden');

              const htmlItems = (await Promise.all(items.map(async (item) => {
                  let imgUrl = item.url;

                  if (!imgUrl && item.path && supabase) {
                      await ensureSupabaseSession();
                      const { data, error } = await supabase.storage
                          .from(SUPABASE_STORAGE_BUCKET)
                          .createSignedUrl(item.path, signedUrlTtlSeconds);

                      if (!error && data?.signedUrl) {
                          imgUrl = data.signedUrl;
                      }
                  }

                  if (!imgUrl) return null;

                  return `
                      <div class="rounded-[2.2rem] overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                          <div class="relative">
                              <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(item.name)}" class="w-full h-40 object-cover bg-slate-100 dark:bg-slate-800">
                              <div class="absolute bottom-0 left-0 right-0 bg-black/40 px-3 py-2">
                                  <p class="text-white text-[10px] font-black truncate">${escapeHtml(item.taskTitle)}</p>
                              </div>
                          </div>
                          <div class="px-4 py-3">
                              <p class="text-[10px] font-bold text-slate-500 truncate">${escapeHtml(item.name || '')}</p>
                              <a href="${escapeHtml(imgUrl)}" target="_blank" rel="noopener noreferrer" class="mt-2 inline-flex items-center gap-2 text-xs font-black text-blue-600 hover:text-blue-700">
                                  Buka Gambar
                                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h5m0 0v5m0-5l-10 10"></path>
                                  </svg>
                              </a>
                          </div>
                      </div>
                  `;
              }))).filter(Boolean);

              if (!htmlItems.length) {
                  grid.innerHTML = '';
                  empty.classList.remove('hidden');
                  return;
              }

              grid.innerHTML = htmlItems.join('');
          };

          const openNewTaskModal = () => {
              // Reset input agar tidak membawa data dari sesi edit sebelumnya.
              document.getElementById('taskForm').reset();
              document.getElementById('editId').value = '';
              document.getElementById('modalHeading').innerText = "Buat Tugas";
              document.getElementById('modalTask').classList.remove('hidden');
          };

          document.getElementById('btnNewTask').onclick = openNewTaskModal;
          document.getElementById('themeToggle').onclick = () => document.documentElement.classList.toggle('dark');
          document.getElementById('btnGallery').onclick = () => {
              document.getElementById('galleryModal').classList.remove('hidden');
              renderGallery().catch((err) => {
                  console.error("Gagal render gallery:", err);
                  document.getElementById('galleryGrid').innerHTML = '';
                  document.getElementById('galleryEmptyState').classList.remove('hidden');
              });
          };
          document.getElementById('logoutBtn').onclick = () => { 
              if (unsubscribeTasks) unsubscribeTasks();
              localStorage.clear(); 
              signOut(auth).then(async () => {
                  try {
                      if (supabase) await supabase.auth.signOut();
                  } finally {
                      location.reload();
                  }
              });
          };
          document.getElementById('searchInput').oninput = render;

          document.querySelectorAll('.nav-btn').forEach(btn => {
              btn.onclick = () => {
                  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                  btn.classList.add('active');
                  catFilter = btn.dataset.cat;
                  document.getElementById('currentCategoryTitle').innerText = btn.querySelector('span').innerText;
                  if (window.innerWidth < 1024) document.getElementById('sidebar').classList.add('-translate-x-full');
                  render();
              };
          });

          document.getElementById('openSidebar').onclick = () => document.getElementById('sidebar').classList.remove('-translate-x-full');
          document.addEventListener('click', (e) => {
              const sidebar = document.getElementById('sidebar');
              const openSidebar = document.getElementById('openSidebar');
              if (window.innerWidth < 1024 && !sidebar.contains(e.target) && !openSidebar.contains(e.target)) {
                  sidebar.classList.add('-translate-x-full');
              }
          });

          window.onerror = function (msg, url, lineNo, columnNo, error) {
              console.log("ERROR:", msg);
              document.getElementById('loadingOverlay').classList.add('hidden');
          };
        
        document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeTaskPreview();
        closeModal();
        closeCompleteModal();
        closeGalleryModal();
    }
});
