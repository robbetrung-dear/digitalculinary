/**
 * ============================================================================
 * SISTEM AKUNTANSI & KEUANGAN (DOUBLE-ENTRY ACCOUNTING ENGINE)
 * Digital Culinary / Dapur Kuliner - Panel Admin & Owner
 * 
 * Modul:
 * 1. Chart of Accounts (COA) Standar 18 Akun F&B (Default 0, Sync via API)
 * 2. Jurnal Umum (General Journal) & Validasi Double-Entry
 * 3. Buku Besar (General Ledger) dengan Saldo Berjalan
 * 4. Laporan Laba Rugi (Profit & Loss / P&L)
 * 5. Laporan Arus Kas (Cash Flow Statement)
 * 6. Laporan Neraca Keuangan (Balance Sheet SAK EMKM)
 * 7. Visualisasi Tren Arus Kas 30 Hari (Chart.js)
 * 8. Generator Ekspor Dokumen Resmi (jsPDF & CSV)
 * 9. Hook Auto-Jurnal Realtime dari Transaksi POS Kasir
 * ============================================================================
 */

// Global Chart instance reference
let _accountingChartInstance = null;

// ============================================================================
// PREDEFINED CHART OF ACCOUNTS (COA) STANDAR RESTO & CATERING (NILAI AWAL 0)
// ============================================================================
const DEFAULT_COA = [
  { code: '1001', name: 'Kas di Tangan (Cash on Hand)', type: 'Aset', normalBalance: 'Debit', initialBalance: 0, currentBalance: 0 },
  { code: '1002', name: 'Kas di Bank (BCA Operasional)', type: 'Aset', normalBalance: 'Debit', initialBalance: 0, currentBalance: 0 },
  { code: '1003', name: 'Piutang Usaha / Catering', type: 'Aset', normalBalance: 'Debit', initialBalance: 0, currentBalance: 0 },
  { code: '1004', name: 'Persediaan Bahan Baku (Stok)', type: 'Aset', normalBalance: 'Debit', initialBalance: 0, currentBalance: 0 },
  { code: '1005', name: 'Peralatan & Mesin Dapur', type: 'Aset', normalBalance: 'Debit', initialBalance: 0, currentBalance: 0 },
  { code: '2001', name: 'Hutang Dagang / Supplier', type: 'Kewajiban', normalBalance: 'Kredit', initialBalance: 0, currentBalance: 0 },
  { code: '2002', name: 'Hutang Beban & Operasional', type: 'Kewajiban', normalBalance: 'Kredit', initialBalance: 0, currentBalance: 0 },
  { code: '3001', name: 'Modal Pemilik', type: 'Ekuitas', normalBalance: 'Kredit', initialBalance: 0, currentBalance: 0 },
  { code: '3002', name: 'Laba Ditahan', type: 'Ekuitas', normalBalance: 'Kredit', initialBalance: 0, currentBalance: 0 },
  { code: '3003', name: 'Prive Pemilik', type: 'Ekuitas', normalBalance: 'Debit', initialBalance: 0, currentBalance: 0 },
  { code: '4001', name: 'Pendapatan Penjualan POS', type: 'Pendapatan', normalBalance: 'Kredit', initialBalance: 0, currentBalance: 0 },
  { code: '4002', name: 'Pendapatan Pesanan Catering', type: 'Pendapatan', normalBalance: 'Kredit', initialBalance: 0, currentBalance: 0 },
  { code: '5001', name: 'Harga Pokok Penjualan (HPP)', type: 'Beban', normalBalance: 'Debit', initialBalance: 0, currentBalance: 0 },
  { code: '6001', name: 'Beban Gaji Karyawan', type: 'Beban', normalBalance: 'Debit', initialBalance: 0, currentBalance: 0 },
  { code: '6002', name: 'Beban Sewa Tempat & Outlet', type: 'Beban', normalBalance: 'Debit', initialBalance: 0, currentBalance: 0 },
  { code: '6003', name: 'Beban Listrik, Air & Gas', type: 'Beban', normalBalance: 'Debit', initialBalance: 0, currentBalance: 0 },
  { code: '6004', name: 'Beban Marketing & Iklan', type: 'Beban', normalBalance: 'Debit', initialBalance: 0, currentBalance: 0 },
  { code: '6005', name: 'Beban Operasional & Kurir', type: 'Beban', normalBalance: 'Debit', initialBalance: 0, currentBalance: 0 }
];

const DEFAULT_JOURNALS = [];

// ============================================================================
// HELPER FUNCTIONS AKUNTANSI
// ============================================================================

function formatRupiah(num) {
  if (isNaN(num) || num === null || num === undefined) return 'Rp 0';
  const val = Math.round(Number(num));
  return 'Rp ' + val.toLocaleString('id-ID');
}

function formatDate(ts) {
  if (!ts) return '-';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return String(ts);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function validateDoubleEntry(debitAmount, creditAmount) {
  const d = Math.round(Number(debitAmount) || 0);
  const c = Math.round(Number(creditAmount) || 0);
  return d > 0 && c > 0 && d === c;
}

function hitungSaldo(initialBalance, totalDebit, totalCredit, accountType) {
  const init = Number(initialBalance) || 0;
  const deb = Number(totalDebit) || 0;
  const kre = Number(totalCredit) || 0;

  if (accountType === 'Aset' || accountType === 'Beban' || accountType === 'Prive') {
    return init + deb - kre;
  }
  return init + kre - deb;
}

// ============================================================================
// ALPINE.JS COMPONENT: accountingApp()
// ============================================================================
window.accountingApp = function() {
  return {
    // ------------------------------------------------------------------------
    // STATE VARIABEL
    // ------------------------------------------------------------------------
    activeTab: 'dashboard',
    reportSubTab: 'pl',
    mobileMenuOpen: false,
    
    // Filter & Periode
    bulanAktif: '2026-09',
    tahunAktif: 2026,
    coaFilterType: 'all',
    jurnalFilterAkun: 'all',
    jurnalSearch: '',
    ledgerAkun: '1001',
    
    // Status UI & Summary Realtime State
    loading: false,
    loadingSummary: false,
    toastMsg: '',
    toastType: 'success',
    toastVisible: false,

    summary: {
      totalAset: 0,
      totalKewajiban: 0,
      totalEkuitas: 0,
      labaBulanIni: 0,
      kas: 0,
      bank: 0,
      piutang: 0,
      hutang: 0,
      pendapatan: 0,
      hpp: 0,
      beban: 0
    },

    // Data Master & Transaksi
    coaList: [],
    jurnalList: [],
    ledgerData: {
      account: null,
      openingBalance: 0,
      totalDebit: 0,
      totalCredit: 0,
      closingBalance: 0,
      transactions: []
    },

    // Laporan Keuangan
    laporanData: {
      pl: {
        pendapatanPOS: 0,
        pendapatanCatering: 0,
        totalPendapatan: 0,
        hpp: 0,
        labaKotor: 0,
        bebanGaji: 0,
        bebanSewa: 0,
        bebanListrik: 0,
        bebanMarketing: 0,
        bebanOperasional: 0,
        totalBeban: 0,
        labaBersih: 0
      },
      cashFlow: {
        penerimaanPelanggan: 0,
        pembayaranSupplier: 0,
        pembayaranGaji: 0,
        pembayaranOperasional: 0,
        kasBersihOperasi: 0,
        pembelianPeralatan: 0,
        kasBersihInvestasi: 0,
        setoranModal: 0,
        prive: 0,
        kasBersihPendanaan: 0,
        kenaikanKas: 0,
        kasAwal: 0,
        kasAkhir: 0
      },
      balanceSheet: {
        kas: 0,
        bank: 0,
        piutang: 0,
        persediaan: 0,
        totalAsetLancar: 0,
        peralatan: 0,
        totalAsetTetap: 0,
        totalAset: 0,
        hutangSupplier: 0,
        hutangBeban: 0,
        totalKewajiban: 0,
        modalPemilik: 0,
        labaDitahan: 0,
        labaBerjalan: 0,
        prive: 0,
        totalEkuitas: 0,
        totalKewajibanEkuitas: 0,
        isBalance: true,
        selisih: 0
      }
    },

    // Modals
    modalEditSaldo: false,
    modalAddAkun: false,
    modalDetailJurnal: false,
    modalViewProof: false,
    selectedProofImg: '',
    selectedJurnal: null,

    editingCoa: { code: '', name: '', initialBalance: 0 },
    newCoaForm: { code: '', name: '', type: 'Aset', initialBalance: 0 },

    manualJournalForm: {
      date: new Date().toISOString().split('T')[0],
      desc: '',
      debitAccount: '6001',
      creditAccount: '1001',
      amount: 0,
      ref: '',
      proofImage: ''
    },

    exportForm: {
      period: '2026-09',
      reportType: 'all',
      format: 'pdf'
    },

    exportHistory: [],
    _fbConfig: null,

    // ------------------------------------------------------------------------
    // GETTER COMPUTED
    // ------------------------------------------------------------------------
    get summaryMetrics() {
      const s = this.summary || {};
      const bs = this.laporanData?.balanceSheet || {};
      const pl = this.laporanData?.pl || {};
      return {
        totalAset: s.totalAset || bs.totalAset || 0,
        totalKewajiban: s.totalKewajiban || bs.totalKewajiban || 0,
        totalEkuitas: s.totalEkuitas || bs.totalEkuitas || 0,
        labaBulanIni: s.labaBulanIni || pl.labaBersih || 0,
        kasDiTangan: s.kas || bs.kas || 0,
        kasDiBank: s.bank || bs.bank || 0,
        piutang: s.piutang || bs.piutang || 0,
        hutangSupplier: s.hutang || bs.hutangSupplier || 0
      };
    },

    get isEmptyDatabase() {
      const m = this.summaryMetrics;
      return m.totalAset === 0 &&
             m.totalKewajiban === 0 &&
             m.totalEkuitas === 0 &&
             m.labaBulanIni === 0 &&
             m.kasDiTangan === 0 &&
             m.kasDiBank === 0 &&
             (!this.jurnalList || this.jurnalList.length === 0);
    },

    // ------------------------------------------------------------------------
    // 1. INITIALIZATION (init)
    // ------------------------------------------------------------------------
    async init() {
      const adminSession = sessionStorage.getItem('dapur_admin_session');
      if (!adminSession) {
        alert('Akses Terbatas: Silakan login sebagai Admin / Owner terlebih dahulu.');
        window.location.href = '/';
        return;
      }

      const now = new Date();
      const curYear = now.getFullYear();
      const curMonth = String(now.getMonth() + 1).padStart(2, '0');
      this.bulanAktif = `${curYear}-${curMonth}`;
      this.tahunAktif = curYear;
      this.exportForm.period = this.bulanAktif;

      this.loading = true;

      await this.initFirebaseConfig();

      // PANGGIL SEMUA API REALTIME SECARA BERURUTAN / SIMULTAN
      await this.loadCOA();
      await this.loadJurnal(this.bulanAktif);
      await this.loadSummary(this.bulanAktif);
      await this.loadDashboard();

      this.loadExportHistory();

      // Listener Perubahan Periode
      this.$watch('bulanAktif', async (newVal) => {
        this.exportForm.period = newVal;
        this.loading = true;
        await this.loadJurnal(newVal);
        await this.loadSummary(newVal);
        await this.loadDashboard();
        if (this.activeTab === 'ledger') {
          await this.loadLedger(this.ledgerAkun, newVal);
        }
        this.loading = false;
      });

      this.$watch('ledgerAkun', async (newVal) => {
        if (newVal) {
          await this.loadLedger(newVal, this.bulanAktif);
        }
      });

      this.loading = false;

      this.$nextTick(() => {
        this.renderCashFlowChart();
      });

      window._accountingAppInstance = this;
    },

    async initFirebaseConfig() {
      try {
        const res = await fetch('/api/firebase-config');
        if (res.ok) {
          this._fbConfig = await res.json();
        }
      } catch (e) {
        console.warn('Firebase config fetch note:', e);
      }
    },

    // ------------------------------------------------------------------------
    // 2. FETCH REALTIME APIS (SUMMARY, COA, JOURNAL, LEDGER)
    // ------------------------------------------------------------------------

    /**
     * GET /accounting/summary/{bulan}
     */
    async loadSummary(bulan) {
      const targetBulan = bulan || this.bulanAktif;
      try {
        this.loadingSummary = true;
        console.log(`[ACCT-APP] Fetching summary for period: ${targetBulan}`);
        const res = await fetch(`/accounting/summary/${encodeURIComponent(targetBulan)}`);
        
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: Gagal mengambil summary`);
        }

        const json = await res.json();
        if (json && json.success && json.data) {
          const d = json.data;
          
          const kas = Number(d.saldoKas) || 0;
          const bank = Number(d.saldoBank) || 0;
          const piutang = Number(d.piutang) || 0;
          const persediaan = Number(d.persediaanAkhir) || 0;
          
          const totalPendapatan = Number(d.pendapatan?.totalPendapatan) || 0;
          const totalHpp = Number(d.hpp?.totalHpp) || 0;
          const totalBeban = Number(d.bebanOperasional?.totalBeban) || 0;
          const labaBersih = Number(d.labaBersih) || (totalPendapatan - totalHpp - totalBeban);

          const hutangSupplier = Number(d.hutangSupplier) || 0;
          const totalKewajiban = Number(d.totalKewajiban) || hutangSupplier;

          const calcTotalAset = Number(d.totalAset) || (kas + bank + piutang + persediaan);
          const calcTotalEkuitas = Number(d.totalEkuitas) || (calcTotalAset - totalKewajiban);

          this.summary = {
            totalAset: calcTotalAset,
            totalKewajiban: totalKewajiban,
            totalEkuitas: calcTotalEkuitas,
            labaBulanIni: labaBersih,
            kas: kas,
            bank: bank,
            piutang: piutang,
            hutang: hutangSupplier,
            pendapatan: totalPendapatan,
            hpp: totalHpp,
            beban: totalBeban
          };

          // Sinkronkan ke laporanData
          this.laporanData.pl = {
            pendapatanPOS: Number(d.pendapatan?.penjualanPos) || 0,
            pendapatanCatering: Number(d.pendapatan?.penjualanCatering) || 0,
            totalPendapatan,
            hpp: totalHpp,
            labaKotor: Number(d.labaKotor) || (totalPendapatan - totalHpp),
            bebanGaji: Number(d.bebanOperasional?.gaji) || 0,
            bebanSewa: Number(d.bebanOperasional?.sewa) || 0,
            bebanListrik: Number(d.bebanOperasional?.utilitas) || 0,
            bebanMarketing: Number(d.bebanOperasional?.marketing) || 0,
            bebanOperasional: Number(d.bebanOperasional?.kurir || d.bebanOperasional?.penyusutan) || 0,
            totalBeban,
            labaBersih
          };

          this.laporanData.balanceSheet = {
            kas,
            bank,
            piutang,
            persediaan,
            totalAsetLancar: kas + bank + piutang + persediaan,
            peralatan: 0,
            totalAsetTetap: 0,
            totalAset: calcTotalAset,
            hutangSupplier,
            hutangBeban: 0,
            totalKewajiban,
            modalPemilik: 0,
            labaDitahan: 0,
            labaBerjalan: labaBersih,
            prive: 0,
            totalEkuitas: calcTotalEkuitas,
            totalKewajibanEkuitas: totalKewajiban + calcTotalEkuitas,
            isBalance: true,
            selisih: 0
          };

          console.log(`[ACCT-APP] Summary successfully loaded for ${targetBulan}:`, this.summary);
        } else {
          console.warn(`[ACCT-APP] Summary empty or null for ${targetBulan}. Resetting state to 0.`);
          this.summary = {
            totalAset: 0, totalKewajiban: 0, totalEkuitas: 0,
            labaBulanIni: 0, kas: 0, bank: 0, piutang: 0, hutang: 0,
            pendapatan: 0, hpp: 0, beban: 0
          };
        }
      } catch (err) {
        console.error(`[ACCT-APP] Load summary error for ${targetBulan}:`, err);
        this.summary = {
          totalAset: 0, totalKewajiban: 0, totalEkuitas: 0,
          labaBulanIni: 0, kas: 0, bank: 0, piutang: 0, hutang: 0,
          pendapatan: 0, hpp: 0, beban: 0
        };
        this.showToast(`Gagal memuat ringkasan keuangan periode ${targetBulan}`, 'error');
      } finally {
        this.loadingSummary = false;
      }
    },

    /**
     * GET /accounting/coa
     */
    async loadCOA() {
      try {
        console.log('[ACCT-APP] Fetching Chart of Accounts...');
        const res = await fetch('/accounting/coa');
        
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: Gagal mengambil COA`);
        }

        const json = await res.json();
        if (json && json.success && json.data) {
          let loadedCoa = [];
          const data = json.data;

          if (Array.isArray(data)) {
            loadedCoa = data.map(item => ({
              code: String(item.code || item.acc || ''),
              name: String(item.name || item.n || ''),
              type: String(item.type || item.t || 'Aset'),
              normalBalance: item.normalBalance || ((item.type === 'Kewajiban' || item.type === 'Ekuitas' || item.type === 'Pendapatan') ? 'Kredit' : 'Debit'),
              initialBalance: Number(item.initialBalance) || 0,
              currentBalance: Number(item.currentBalance) || 0
            }));
          } else if (typeof data === 'object') {
            const typeMap = {
              'asset': 'Aset',
              'liability': 'Kewajiban',
              'equity': 'Ekuitas',
              'revenue': 'Pendapatan',
              'expense': 'Beban'
            };
            loadedCoa = Object.entries(data).map(([code, val]) => ({
              code: String(code),
              name: typeof val === 'string' ? val : (val.n || val.name || `Akun ${code}`),
              type: typeof val === 'object' && val.t ? (typeMap[val.t] || val.t) : (val.type || 'Aset'),
              normalBalance: (val.t === 'liability' || val.t === 'equity' || val.t === 'revenue' || val.type === 'Kewajiban' || val.type === 'Ekuitas' || val.type === 'Pendapatan') ? 'Kredit' : 'Debit',
              initialBalance: Number(val.initialBalance || val.opening) || 0,
              currentBalance: Number(val.currentBalance || val.closing) || 0
            }));
          }

          if (loadedCoa.length > 0) {
            this.coaList = loadedCoa;
          } else {
            this.coaList = JSON.parse(JSON.stringify(DEFAULT_COA));
          }
          console.log(`[ACCT-APP] COA loaded successfully (${this.coaList.length} accounts)`);
        } else {
          console.warn('[ACCT-APP] COA API empty. Using default 18 accounts with 0 balance.');
          this.coaList = JSON.parse(JSON.stringify(DEFAULT_COA));
        }
      } catch (err) {
        console.error('[ACCT-APP] Error loadCOA:', err);
        this.coaList = JSON.parse(JSON.stringify(DEFAULT_COA));
        this.showToast('Gagal memuat Chart of Accounts dari server', 'error');
      } finally {
        this.recalculateAllAccountBalances();
      }
    },

    /**
     * GET /accounting/journal/{bulan}
     */
    async loadJurnal(bulan) {
      const targetBulan = bulan || this.bulanAktif;
      try {
        console.log(`[ACCT-APP] Fetching journal entries for: ${targetBulan}`);
        const res = await fetch(`/accounting/journal/${encodeURIComponent(targetBulan)}`);
        
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: Gagal mengambil jurnal`);
        }

        const json = await res.json();
        if (json && json.success && Array.isArray(json.data)) {
          const formatted = json.data.map(j => {
            let debitCode = j.debitCode || '';
            let debitName = j.debitName || '';
            let debitAmount = Number(j.debitAmount) || 0;
            let creditCode = j.creditCode || '';
            let creditName = j.creditName || '';
            let creditAmount = Number(j.creditAmount) || 0;

            if ((!debitCode || !creditCode) && Array.isArray(j.lines) && j.lines.length >= 2) {
              const dLine = j.lines.find(l => Number(l.debit) > 0) || j.lines[0];
              const cLine = j.lines.find(l => Number(l.credit) > 0) || j.lines[1];
              if (dLine) {
                debitCode = dLine.acc || dLine.code || '';
                debitAmount = Number(dLine.debit) || 0;
                const foundCoa = (this.coaList || []).find(c => c.code === debitCode);
                debitName = foundCoa ? foundCoa.name : `Akun ${debitCode}`;
              }
              if (cLine) {
                creditCode = cLine.acc || cLine.code || '';
                creditAmount = Number(cLine.credit) || 0;
                const foundCoa = (this.coaList || []).find(c => c.code === creditCode);
                creditName = foundCoa ? foundCoa.name : `Akun ${creditCode}`;
              }
            }

            return {
              id: j.id || j.firebaseKey || j.noEntry,
              date: j.date || formatDate(j.timestamp || Date.now()),
              timestamp: j.timestamp || Date.now(),
              noEntry: j.noEntry || j.ref || 'JE-0000',
              desc: j.desc || j.keterangan || '-',
              debitCode,
              debitName,
              debitAmount,
              creditCode,
              creditName,
              creditAmount,
              ref: j.ref || j.noEntry || '-',
              proof: j.proof || '',
              status: j.status || 'approved',
              lines: j.lines || []
            };
          });

          formatted.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          this.jurnalList = formatted;
          console.log(`[ACCT-APP] Loaded ${this.jurnalList.length} journal entries for ${targetBulan}`);
        } else {
          console.warn(`[ACCT-APP] Journal empty for ${targetBulan}`);
          this.jurnalList = [];
        }
      } catch (err) {
        console.error(`[ACCT-APP] Error loadJurnal for ${targetBulan}:`, err);
        this.jurnalList = [];
        this.showToast(`Gagal memuat jurnal periode ${targetBulan}`, 'error');
      } finally {
        this.recalculateAllAccountBalances();
      }
    },

    /**
     * GET /accounting/ledger/{acc}/{bulan}
     */
    async loadLedger(accCode, bulan) {
      if (!accCode) accCode = '1001';
      const targetBulan = bulan || this.bulanAktif;
      this.ledgerAkun = accCode;

      const accObj = this.coaList.find(c => c.code === accCode) || {
        code: accCode,
        name: 'Akun ' + accCode,
        type: 'Aset',
        initialBalance: 0
      };

      let openingBal = Number(accObj.initialBalance) || 0;
      let runningBalance = openingBal;
      let totalDebit = 0;
      let totalCredit = 0;
      const transactions = [];

      try {
        console.log(`[ACCT-APP] Fetching ledger for account ${accCode} period ${targetBulan}`);
        const res = await fetch(`/accounting/ledger/${encodeURIComponent(accCode)}/${encodeURIComponent(targetBulan)}`);
        if (res.ok) {
          const json = await res.json();
          if (json && json.success && json.data) {
            if (json.data.opening !== undefined) openingBal = Number(json.data.opening) || 0;
            runningBalance = openingBal;
          }
        }
      } catch (err) {
        console.warn(`[ACCT-APP] Ledger fetch note for ${accCode}:`, err);
      }

      // Hitung mutasi dari jurnalList
      const relatedJournals = (this.jurnalList || [])
        .filter(j => j.debitCode === accCode || j.creditCode === accCode)
        .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

      relatedJournals.forEach(j => {
        const isDebit = j.debitCode === accCode;
        const dAmt = isDebit ? Number(j.debitAmount) || 0 : 0;
        const cAmt = !isDebit ? Number(j.creditAmount) || 0 : 0;

        totalDebit += dAmt;
        totalCredit += cAmt;

        if (accObj.type === 'Aset' || accObj.type === 'Beban' || accObj.type === 'Prive') {
          runningBalance += (dAmt - cAmt);
        } else {
          runningBalance += (cAmt - dAmt);
        }

        transactions.push({
          date: j.date,
          ref: j.ref || j.noEntry,
          desc: j.desc,
          debit: dAmt,
          credit: cAmt,
          runningBalance: runningBalance
        });
      });

      this.ledgerData = {
        account: accObj,
        openingBalance: openingBal,
        totalDebit: totalDebit,
        totalCredit: totalCredit,
        closingBalance: runningBalance,
        transactions: transactions
      };

      return this.ledgerData;
    },

    // ------------------------------------------------------------------------
    // 3. PENGELOLAAN COA & SALDO AWAL
    // ------------------------------------------------------------------------

    async updateSaldoAwal(accCode, nilai) {
      const amt = Number(nilai) || 0;
      const target = this.coaList.find(c => c.code === accCode);
      if (!target) return;

      target.initialBalance = amt;
      this.recalculateAllAccountBalances();

      try {
        await fetch(`/accounting/coa/${encodeURIComponent(accCode)}/saldoAwal`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ saldoAwal: amt })
        });
      } catch (e) {
        console.warn('Server update saldo awal note:', e);
      }

      this.showToast(`Saldo awal akun [${accCode}] berhasil diperbarui`, 'success');
      this.modalEditSaldo = false;
      await this.loadSummary(this.bulanAktif);
      await this.loadDashboard();
    },

    async tambahAkun() {
      const { code, name, type, initialBalance } = this.newCoaForm;
      if (!code || !name) {
        this.showToast('Kode dan Nama Akun wajib diisi', 'error');
        return;
      }

      if (this.coaList.some(c => c.code === code.trim())) {
        this.showToast(`Kode akun [${code}] sudah digunakan`, 'error');
        return;
      }

      const newAcc = {
        code: code.trim(),
        name: name.trim(),
        type: type || 'Aset',
        normalBalance: (type === 'Kewajiban' || type === 'Ekuitas' || type === 'Pendapatan') ? 'Kredit' : 'Debit',
        initialBalance: Number(initialBalance) || 0,
        currentBalance: Number(initialBalance) || 0
      };

      this.coaList.push(newAcc);
      this.coaList.sort((a, b) => a.code.localeCompare(b.code));

      try {
        await fetch('/accounting/coa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newAcc)
        });
      } catch (e) {}

      this.showToast(`Akun [${newAcc.code} - ${newAcc.name}] berhasil ditambahkan!`, 'success');
      this.newCoaForm = { code: '', name: '', type: 'Aset', initialBalance: 0 };
      this.modalAddAkun = false;
      this.recalculateAllAccountBalances();
      await this.loadSummary(this.bulanAktif);
      await this.loadDashboard();
    },

    recalculateAllAccountBalances() {
      const totalsByAcc = {};

      this.coaList.forEach(acc => {
        totalsByAcc[acc.code] = {
          initial: Number(acc.initialBalance) || 0,
          debit: 0,
          credit: 0,
          type: acc.type
        };
      });

      this.jurnalList.forEach(j => {
        const dCode = j.debitCode;
        const cCode = j.creditCode;
        const dAmt = Number(j.debitAmount) || 0;
        const cAmt = Number(j.creditAmount) || 0;

        if (totalsByAcc[dCode]) totalsByAcc[dCode].debit += dAmt;
        if (totalsByAcc[cCode]) totalsByAcc[cCode].credit += cAmt;
      });

      this.coaList.forEach(acc => {
        const stat = totalsByAcc[acc.code];
        if (stat) {
          acc.currentBalance = hitungSaldo(stat.initial, stat.debit, stat.credit, stat.type);
        }
      });
    },

    // ------------------------------------------------------------------------
    // 4. JURNAL MANUAL
    // ------------------------------------------------------------------------

    async tambahJurnalManual() {
      const { date, desc, debitAccount, creditAccount, amount, ref, proofImage } = this.manualJournalForm;
      const amt = Number(amount) || 0;

      if (!desc || amt <= 0) {
        this.showToast('Deskripsi dan nominal transaksi valid wajib diisi', 'error');
        return;
      }

      if (!debitAccount || !creditAccount) {
        this.showToast('Pilih Akun Debit dan Akun Kredit yang sesuai', 'error');
        return;
      }

      if (debitAccount === creditAccount) {
        this.showToast('Akun Debit dan Akun Kredit tidak boleh sama!', 'error');
        return;
      }

      if (!validateDoubleEntry(amt, amt)) {
        this.showToast('Transaksi tidak seimbang (Double-entry mismatch)', 'error');
        return;
      }

      const debitAccObj = this.coaList.find(c => c.code === debitAccount) || { name: 'Akun ' + debitAccount };
      const creditAccObj = this.coaList.find(c => c.code === creditAccount) || { name: 'Akun ' + creditAccount };

      const entryId = 'J' + Date.now();
      const noEntry = 'JE-' + String(this.jurnalList.length + 1).padStart(4, '0');
      const txDate = date || new Date().toISOString().split('T')[0];
      const bulanKey = txDate.substring(0, 7);

      const newEntry = {
        id: entryId,
        date: txDate,
        timestamp: new Date(txDate).getTime() || Date.now(),
        noEntry: noEntry,
        desc: desc.trim(),
        debitCode: debitAccount,
        debitName: debitAccObj.name,
        debitAmount: amt,
        creditCode: creditAccount,
        creditName: creditAccObj.name,
        creditAmount: amt,
        ref: ref ? ref.trim() : `MANUAL-${entryId.slice(-4)}`,
        proof: proofImage || '',
        status: 'approved',
        lines: [
          { acc: debitAccount, debit: amt, credit: 0 },
          { acc: creditAccount, debit: 0, credit: amt }
        ]
      };

      this.jurnalList.unshift(newEntry);

      try {
        await fetch(`/accounting/journal/${encodeURIComponent(bulanKey)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newEntry)
        });
      } catch (e) {
        console.warn('Manual journal save note:', e);
      }

      this.recalculateAllAccountBalances();
      await this.loadSummary(bulanKey);
      await this.loadDashboard();

      this.showToast(`Jurnal [${noEntry}] sebesar ${formatRupiah(amt)} berhasil dicatat!`, 'success');

      this.manualJournalForm = {
        date: new Date().toISOString().split('T')[0],
        desc: '',
        debitAccount: '6001',
        creditAccount: '1001',
        amount: 0,
        ref: '',
        proofImage: ''
      };

      this.setTab('jurnal');
    },

    handleProofUpload(event) {
      const file = event.target.files[0];
      if (!file) return;

      if (file.size > 2 * 1024 * 1024) {
        this.showToast('Ukuran file maksimal 2MB', 'error');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        this.manualJournalForm.proofImage = e.target.result;
        this.showToast('Bukti transaksi berhasil dilampirkan', 'success');
      };
      reader.readAsDataURL(file);
    },

    applyPreset(type) {
      const today = new Date().toISOString().split('T')[0];
      switch(type) {
        case 'operasional':
          this.manualJournalForm = {
            date: today,
            desc: 'Pembayaran Beban Operasional / Perlengkapan Toko',
            debitAccount: '6005',
            creditAccount: '1001',
            amount: 0,
            ref: 'OPS-' + Date.now().toString().slice(-4),
            proofImage: ''
          };
          break;
        case 'setorBank':
          this.manualJournalForm = {
            date: today,
            desc: 'Setor Kas Harian Kasir ke Rekening Bank BCA',
            debitAccount: '1002',
            creditAccount: '1001',
            amount: 0,
            ref: 'SETOR-BCA-' + Date.now().toString().slice(-4),
            proofImage: ''
          };
          break;
        case 'beliBahan':
          this.manualJournalForm = {
            date: today,
            desc: 'Pembelian Bahan Baku Segar Ayam, Daging & Sayur',
            debitAccount: '5001',
            creditAccount: '1001',
            amount: 0,
            ref: 'BELI-BAHAN-' + Date.now().toString().slice(-4),
            proofImage: ''
          };
          break;
        case 'prive':
          this.manualJournalForm = {
            date: today,
            desc: 'Penarikan Prive untuk Keperluan Pribadi Pemilik',
            debitAccount: '3003',
            creditAccount: '1002',
            amount: 0,
            ref: 'PRIVE-' + Date.now().toString().slice(-4),
            proofImage: ''
          };
          break;
        case 'pemasukanLain':
          this.manualJournalForm = {
            date: today,
            desc: 'Penerimaan Pendapatan Pesanan Catering / Event Khusus',
            debitAccount: '1002',
            creditAccount: '4002',
            amount: 0,
            ref: 'CAT-EVENT-' + Date.now().toString().slice(-4),
            proofImage: ''
          };
          break;
        case 'adjustment':
          this.manualJournalForm = {
            date: today,
            desc: 'Penyesuaian Selisih Kas Fisik / Stock Opname Bahan',
            debitAccount: '6005',
            creditAccount: '1004',
            amount: 0,
            ref: 'ADJ-' + Date.now().toString().slice(-4),
            proofImage: ''
          };
          break;
      }
      this.showToast(`Preset [${type}] berhasil diaplikasikan`, 'success');
    },

    // ------------------------------------------------------------------------
    // 5. KALKULASI LAPORAN KEUANGAN (LABA RUGI, ARUS KAS, NERACA)
    // ------------------------------------------------------------------------

    async loadLabaRugi(bulan) {
      let revPOS = 0;
      let revCatering = 0;
      let hpp = 0;
      let gaji = 0;
      let sewa = 0;
      let listrik = 0;
      let marketing = 0;
      let operasional = 0;

      this.jurnalList.forEach(j => {
        const dAmt = Number(j.debitAmount) || 0;
        const cAmt = Number(j.creditAmount) || 0;

        if (j.creditCode === '4001' || j.creditCode === '401') revPOS += cAmt;
        if (j.debitCode === '4001' || j.debitCode === '401') revPOS -= dAmt;

        if (j.creditCode === '4002' || j.creditCode === '402') revCatering += cAmt;
        if (j.debitCode === '4002' || j.debitCode === '402') revCatering -= dAmt;

        if (j.debitCode === '5001' || j.debitCode === '501') hpp += dAmt;
        if (j.creditCode === '5001' || j.creditCode === '501') hpp -= cAmt;

        if (j.debitCode === '6001' || j.debitCode === '601') gaji += dAmt;
        if (j.creditCode === '6001' || j.creditCode === '601') gaji -= cAmt;

        if (j.debitCode === '6002' || j.debitCode === '602') sewa += dAmt;
        if (j.creditCode === '6002' || j.creditCode === '602') sewa -= cAmt;

        if (j.debitCode === '6003' || j.debitCode === '603') listrik += dAmt;
        if (j.creditCode === '6003' || j.creditCode === '603') listrik -= cAmt;

        if (j.debitCode === '6004' || j.debitCode === '604') marketing += dAmt;
        if (j.creditCode === '6004' || j.creditCode === '604') marketing -= cAmt;

        if (j.debitCode === '6005' || j.debitCode === '605') operasional += dAmt;
        if (j.creditCode === '6005' || j.creditCode === '605') operasional -= cAmt;
      });

      const totalPendapatan = revPOS + revCatering;
      const labaKotor = totalPendapatan - hpp;
      const totalBeban = gaji + sewa + listrik + marketing + operasional;
      const labaBersih = labaKotor - totalBeban;

      this.laporanData.pl = {
        pendapatanPOS: revPOS,
        pendapatanCatering: revCatering,
        totalPendapatan,
        hpp,
        labaKotor,
        bebanGaji: gaji,
        bebanSewa: sewa,
        bebanListrik: listrik,
        bebanMarketing: marketing,
        bebanOperasional: operasional,
        totalBeban,
        labaBersih
      };

      return this.laporanData.pl;
    },

    async loadArusKas(bulan) {
      let penerimaanPelanggan = 0;
      let pembayaranSupplier = 0;
      let pembayaranGaji = 0;
      let pembayaranOperasional = 0;

      let pembelianPeralatan = 0;
      let setoranModal = 0;
      let prive = 0;

      const isKasOrBank = (code) => code === '1001' || code === '1002' || code === '101' || code === '102';

      this.jurnalList.forEach(j => {
        const dAmt = Number(j.debitAmount) || 0;
        const cAmt = Number(j.creditAmount) || 0;

        if (isKasOrBank(j.debitCode)) {
          if (j.creditCode === '4001' || j.creditCode === '4002' || j.creditCode === '1003') {
            penerimaanPelanggan += dAmt;
          } else if (j.creditCode === '3001') {
            setoranModal += dAmt;
          }
        }

        if (isKasOrBank(j.creditCode)) {
          if (j.debitCode === '5001' || j.debitCode === '2001' || j.debitCode === '1004') {
            pembayaranSupplier += cAmt;
          } else if (j.debitCode === '6001') {
            pembayaranGaji += cAmt;
          } else if (j.debitCode === '6002' || j.debitCode === '6003' || j.debitCode === '6004' || j.debitCode === '6005') {
            pembayaranOperasional += cAmt;
          } else if (j.debitCode === '1005') {
            pembelianPeralatan += cAmt;
          } else if (j.debitCode === '3003') {
            prive += cAmt;
          }
        }
      });

      const kasBersihOperasi = penerimaanPelanggan - (pembayaranSupplier + pembayaranGaji + pembayaranOperasional);
      const kasBersihInvestasi = -pembelianPeralatan;
      const kasBersihPendanaan = setoranModal - prive;
      const kenaikanKas = kasBersihOperasi + kasBersihInvestasi + kasBersihPendanaan;

      const kasAwal = ((this.coaList.find(c => c.code === '1001') || {}).initialBalance || 0) +
                      ((this.coaList.find(c => c.code === '1002') || {}).initialBalance || 0);
      const kasAkhir = kasAwal + kenaikanKas;

      this.laporanData.cashFlow = {
        penerimaanPelanggan,
        pembayaranSupplier,
        pembayaranGaji,
        pembayaranOperasional,
        kasBersihOperasi,
        pembelianPeralatan,
        kasBersihInvestasi,
        setoranModal,
        prive,
        kasBersihPendanaan,
        kenaikanKas,
        kasAwal,
        kasAkhir
      };

      return this.laporanData.cashFlow;
    },

    async loadNeraca(bulan) {
      const getBal = (code) => {
        const f = this.coaList.find(c => c.code === code);
        return f ? Number(f.currentBalance) || 0 : 0;
      };

      const kas = getBal('1001');
      const bank = getBal('1002');
      const piutang = getBal('1003');
      const persediaan = getBal('1004');
      const totalAsetLancar = kas + bank + piutang + persediaan;

      const peralatan = getBal('1005');
      const totalAsetTetap = peralatan;
      const totalAset = totalAsetLancar + totalAsetTetap;

      const hutangSupplier = getBal('2001');
      const hutangBeban = getBal('2002');
      const totalKewajiban = hutangSupplier + hutangBeban;

      const modalPemilik = getBal('3001');
      const labaDitahan = getBal('3002');
      const labaBerjalan = this.laporanData.pl.labaBersih || 0;
      const prive = getBal('3003');

      const totalEkuitas = modalPemilik + labaDitahan + labaBerjalan - prive;
      const totalKewajibanEkuitas = totalKewajiban + totalEkuitas;

      const selisih = Math.abs(totalAset - totalKewajibanEkuitas);
      const isBalance = selisih < 100;

      this.laporanData.balanceSheet = {
        kas,
        bank,
        piutang,
        persediaan,
        totalAsetLancar,
        peralatan,
        totalAsetTetap,
        totalAset,
        hutangSupplier,
        hutangBeban,
        totalKewajiban,
        modalPemilik,
        labaDitahan,
        labaBerjalan,
        prive,
        totalEkuitas,
        totalKewajibanEkuitas,
        isBalance,
        selisih
      };

      return this.laporanData.balanceSheet;
    },

    // ------------------------------------------------------------------------
    // 6. DASHBOARD & GRAFIK
    // ------------------------------------------------------------------------

    async loadDashboard() {
      await this.loadLabaRugi(this.bulanAktif);
      await this.loadArusKas(this.bulanAktif);
      await this.loadNeraca(this.bulanAktif);

      this.renderCashFlowChart();
    },

    renderCashFlowChart() {
      const canvas = document.getElementById('cashFlowChartCanvas');
      if (!canvas) return;

      if (_accountingChartInstance) {
        _accountingChartInstance.destroy();
        _accountingChartInstance = null;
      }

      const labels = [];
      const inflowData = [];
      const outflowData = [];

      const today = new Date();
      for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dayLabel = `${d.getDate()}/${d.getMonth() + 1}`;
        labels.push(dayLabel);

        let dayInflow = 0;
        let dayOutflow = 0;

        const dateStr = d.toISOString().split('T')[0];
        this.jurnalList.forEach(j => {
          if (j.date === dateStr) {
            if (j.debitCode === '1001' || j.debitCode === '1002') dayInflow += Number(j.debitAmount) || 0;
            if (j.creditCode === '1001' || j.creditCode === '1002') dayOutflow += Number(j.creditAmount) || 0;
          }
        });

        inflowData.push(dayInflow);
        outflowData.push(dayOutflow);
      }

      const ctx = canvas.getContext('2d');
      _accountingChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Kas Masuk (Inflow)',
              data: inflowData,
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.08)',
              borderWidth: 2.5,
              tension: 0.35,
              fill: true,
              pointRadius: 2,
              pointHoverRadius: 5
            },
            {
              label: 'Kas Keluar (Outflow)',
              data: outflowData,
              borderColor: '#f43f5e',
              backgroundColor: 'rgba(244, 63, 94, 0.04)',
              borderWidth: 2,
              tension: 0.35,
              fill: true,
              pointRadius: 2,
              pointHoverRadius: 5
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
            intersect: false
          },
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  let label = context.dataset.label || '';
                  if (label) label += ': ';
                  if (context.parsed.y !== null) {
                    label += 'Rp ' + Number(context.parsed.y).toLocaleString('id-ID');
                  }
                  return label;
                }
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { font: { size: 10, family: 'Plus Jakarta Sans' }, color: '#78716c' }
            },
            y: {
              grid: { color: '#f5f5f4' },
              ticks: {
                font: { size: 10, family: 'JetBrains Mono' },
                color: '#78716c',
                callback: function(val) {
                  return 'Rp ' + (val / 1000).toLocaleString('id-ID') + 'k';
                }
              }
            }
          }
        }
      });
    },

    // ------------------------------------------------------------------------
    // 7. EXPORT DATA (PDF & CSV GENERATOR)
    // ------------------------------------------------------------------------

    async exportPDF(type, bulan) {
      try {
        const { jsPDF } = window.jspdf || {};
        if (!jsPDF) {
          this.showToast('Pustaka jsPDF belum dimuat', 'error');
          return;
        }

        const doc = new jsPDF({ unit: 'mm', format: 'a4' });
        const periodeStr = bulan || this.bulanAktif;
        const generatedDate = new Date().toLocaleString('id-ID');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text('DIGITAL CULINARY', 105, 18, { align: 'center' });
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text('Sistem Akuntansi & Laporan Keuangan', 105, 24, { align: 'center' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        const titleMap = {
          pl: 'LAPORAN LABA RUGI (PROFIT & LOSS)',
          cashFlow: 'LAPORAN ARUS KAS (CASH FLOW STATEMENT)',
          balanceSheet: 'LAPORAN NERACA KEUANGAN (BALANCE SHEET)',
          all: 'LAPORAN KEUANGAN LENGKAP'
        };
        doc.text(titleMap[type] || 'LAPORAN KEUANGAN', 105, 33, { align: 'center' });

        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.text(`Periode: ${periodeStr} | Dicetak: ${generatedDate}`, 105, 38, { align: 'center' });
        doc.line(15, 42, 195, 42);

        let y = 50;

        if (type === 'pl' || type === 'all') {
          const pl = this.laporanData.pl;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          doc.text('I. PENDAPATAN OPERASIONAL', 15, y); y += 6;

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9.5);
          doc.text('Pendapatan Penjualan POS Kasir', 20, y);
          doc.text(formatRupiah(pl.pendapatanPOS), 195, y, { align: 'right' }); y += 5;

          doc.text('Pendapatan Pesanan Catering', 20, y);
          doc.text(formatRupiah(pl.pendapatanCatering), 195, y, { align: 'right' }); y += 5;

          doc.setFont('helvetica', 'bold');
          doc.text('TOTAL PENDAPATAN', 20, y);
          doc.text(formatRupiah(pl.totalPendapatan), 195, y, { align: 'right' }); y += 8;

          doc.text('II. HARGA POKOK PENJUALAN (HPP)', 15, y); y += 6;
          doc.setFont('helvetica', 'normal');
          doc.text('Harga Pokok Penjualan Bahan Baku', 20, y);
          doc.text('(' + formatRupiah(pl.hpp) + ')', 195, y, { align: 'right' }); y += 6;

          doc.setFont('helvetica', 'bold');
          doc.text('LABA KOTOR', 15, y);
          doc.text(formatRupiah(pl.labaKotor), 195, y, { align: 'right' }); y += 8;

          doc.text('III. BEBAN OPERASIONAL', 15, y); y += 6;
          doc.setFont('helvetica', 'normal');
          doc.text('Beban Gaji Karyawan', 20, y); doc.text(formatRupiah(pl.bebanGaji), 195, y, { align: 'right' }); y += 5;
          doc.text('Beban Sewa Tempat & Outlet', 20, y); doc.text(formatRupiah(pl.bebanSewa), 195, y, { align: 'right' }); y += 5;
          doc.text('Beban Listrik, Air & Gas', 20, y); doc.text(formatRupiah(pl.bebanListrik), 195, y, { align: 'right' }); y += 5;
          doc.text('Beban Marketing & Iklan', 20, y); doc.text(formatRupiah(pl.bebanMarketing), 195, y, { align: 'right' }); y += 5;
          doc.text('Beban Operasional & Kurir', 20, y); doc.text(formatRupiah(pl.bebanOperasional), 195, y, { align: 'right' }); y += 6;

          doc.setFont('helvetica', 'bold');
          doc.text('TOTAL BEBAN OPERASIONAL', 20, y);
          doc.text('(' + formatRupiah(pl.totalBeban) + ')', 195, y, { align: 'right' }); y += 8;

          doc.setFillColor(240, 253, 244);
          doc.rect(15, y - 4, 180, 8, 'F');
          doc.setTextColor(5, 150, 105);
          doc.text('LABA BERSIH (NET PROFIT)', 20, y + 1.5);
          doc.text(formatRupiah(pl.labaBersih), 190, y + 1.5, { align: 'right' });
          doc.setTextColor(0, 0, 0);
          y += 18;
        }

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text('Disiapkan oleh:', 30, y + 10);
        doc.text('Disetujui oleh:', 140, y + 10);
        doc.text('( Bagian Keuangan )', 30, y + 30);
        doc.text('( Owner / Direksi )', 140, y + 30);

        const filename = `Laporan_${type.toUpperCase()}_${periodeStr}.pdf`;
        doc.save(filename);

        this.addExportHistory(titleMap[type] || 'Laporan', periodeStr, 'PDF');
        this.showToast(`Laporan ${filename} berhasil diunduh!`, 'success');
      } catch (err) {
        console.error('Export PDF error:', err);
        this.showToast('Gagal membuat file PDF', 'error');
      }
    },

    async exportCSV(type, bulan) {
      try {
        let csvContent = '';
        const periodeStr = bulan || this.bulanAktif;

        if (type === 'jurnal' || type === 'all') {
          csvContent += 'No Entry,Tanggal,Deskripsi,Akun Debit,Debit (Rp),Akun Kredit,Kredit (Rp),Ref\n';
          this.jurnalList.forEach(j => {
            const desc = `"${(j.desc || '').replace(/"/g, '""')}"`;
            csvContent += `${j.noEntry},${j.date},${desc},${j.debitCode} - ${j.debitName},${j.debitAmount},${j.creditCode} - ${j.creditName},${j.creditAmount},${j.ref || '-'}\n`;
          });
        } else if (type === 'coa') {
          csvContent += 'Kode Akun,Nama Akun,Tipe,Saldo Awal,Saldo Saat Ini\n';
          this.coaList.forEach(c => {
            csvContent += `${c.code},"${c.name}",${c.type},${c.initialBalance},${c.currentBalance}\n`;
          });
        }

        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Akuntansi_${type}_${periodeStr}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.addExportHistory(`Data ${type.toUpperCase()}`, periodeStr, 'CSV');
        this.showToast('File CSV berhasil diunduh', 'success');
      } catch (e) {
        console.error('Export CSV error:', e);
        this.showToast('Gagal export CSV', 'error');
      }
    },

    async exportExcel(type, bulan) {
      await this.exportCSV(type, bulan);
    },

    addExportHistory(report, period, format) {
      const entry = {
        date: new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }),
        report,
        period,
        format,
        status: 'Selesai'
      };
      this.exportHistory.unshift(entry);
      if (this.exportHistory.length > 10) this.exportHistory.pop();
      localStorage.setItem('dapur_export_history', JSON.stringify(this.exportHistory));
    },

    loadExportHistory() {
      const stored = localStorage.getItem('dapur_export_history');
      if (stored) {
        try { this.exportHistory = JSON.parse(stored); } catch (e) {}
      }
      if (!this.exportHistory) {
        this.exportHistory = [];
      }
    },

    // ------------------------------------------------------------------------
    // 8. HOOK AUTO-JURNAL REALTIME TRANSAKSI POS
    // ------------------------------------------------------------------------

    async autoGenerateJurnalDariTransaksi(tx) {
      if (!tx || (!tx.id && !tx.orderId)) return;

      const grandTotal = Number(tx.total || tx.grandTotal) || 0;
      if (grandTotal <= 0) return;

      const pm = String(tx.pm || tx.paymentMethod || 'cash').toLowerCase();
      const txId = tx.orderId || tx.id;
      const dateStr = formatDate(tx.t || tx.timestamp || Date.now());
      const bulanKey = dateStr.substring(0, 7);

      const existing = this.jurnalList.find(j => j.ref === txId);
      if (existing) return;

      let debitCode = '1001';
      let debitName = 'Kas di Tangan (Cash on Hand)';

      if (pm.includes('qris') || pm.includes('bank') || pm.includes('transfer') || pm.includes('ewallet') || pm.includes('gopay') || pm.includes('ovo') || pm.includes('dana')) {
        debitCode = '1002';
        debitName = 'Kas di Bank (BCA Operasional)';
      }

      const creditCode = '4001';
      const creditName = 'Pendapatan Penjualan POS';

      const entryId = 'J' + Date.now();
      const noEntry = 'JE-POS-' + entryId.slice(-4);

      const posJournalEntry = {
        id: entryId,
        date: dateStr,
        timestamp: Number(tx.t || tx.timestamp) || Date.now(),
        noEntry: noEntry,
        desc: `Penerimaan Penjualan POS - Order #${txId} (${pm.toUpperCase()})`,
        debitCode,
        debitName,
        debitAmount: grandTotal,
        creditCode,
        creditName,
        creditAmount: grandTotal,
        ref: txId,
        proof: '',
        status: 'approved',
        lines: [
          { acc: debitCode, debit: grandTotal, credit: 0 },
          { acc: creditCode, debit: 0, credit: grandTotal }
        ]
      };

      this.jurnalList.unshift(posJournalEntry);

      try {
        fetch(`/accounting/journal/${encodeURIComponent(bulanKey)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(posJournalEntry)
        }).catch(e => {});
      } catch (e) {}

      this.recalculateAllAccountBalances();
      await this.loadSummary(bulanKey);
    },

    // ------------------------------------------------------------------------
    // 9. UI HELPERS & NAVIGATION
    // ------------------------------------------------------------------------

    setTab(tab) {
      this.activeTab = tab;
      this.mobileMenuOpen = false;
      if (tab === 'dashboard') {
        this.$nextTick(() => {
          this.renderCashFlowChart();
        });
      } else if (tab === 'ledger') {
        this.loadLedger(this.ledgerAkun, this.bulanAktif);
      } else if (tab === 'laporan') {
        this.loadLabaRugi(this.bulanAktif);
        this.loadArusKas(this.bulanAktif);
        this.loadNeraca(this.bulanAktif);
      }
    },

    formatRupiah(num) {
      return formatRupiah(num);
    },

    getTypeBadgeClass(type) {
      switch(type) {
        case 'Aset': return 'bg-blue-50 text-blue-700 border-blue-200';
        case 'Kewajiban': return 'bg-red-50 text-red-700 border-red-200';
        case 'Ekuitas': return 'bg-green-50 text-green-700 border-green-200';
        case 'Pendapatan': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        case 'Beban': return 'bg-orange-50 text-orange-700 border-orange-200';
        default: return 'bg-stone-50 text-stone-700 border-stone-200';
      }
    },

    showToast(message, type = 'success') {
      this.toastMsg = message;
      this.toastType = type;
      this.toastVisible = true;
      setTimeout(() => {
        this.toastVisible = false;
      }, 3500);
    },

    logoutAdmin() {
      if (confirm('Apakah Anda yakin ingin keluar dari panel Akuntansi & Admin?')) {
        sessionStorage.removeItem('dapur_admin_session');
        window.location.href = '/';
      }
    }
  };
};

// Global Hook Registration
window.recordAccountingEntry = function(tx) {
  try {
    if (window._accountingAppInstance && typeof window._accountingAppInstance.autoGenerateJurnalDariTransaksi === 'function') {
      window._accountingAppInstance.autoGenerateJurnalDariTransaksi(tx);
    }
  } catch (err) {
    console.warn('Hook recordAccountingEntry note:', err);
  }
};
