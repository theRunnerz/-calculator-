const whitelist = ["TY691Xr2EWgKJmHfm7NWKMRJjojLmS2cma"]; // Allowed wallets

document.getElementById("connect-btn").addEventListener("click", async () => {
  try {
    // Check if TronLink is installed
    if (!window.tronWeb || !window.tronWeb.defaultAddress.base58) {
      alert("Please install TronLink and unlock your wallet.");
      return;
    }

    const wallet = window.tronWeb.defaultAddress.base58;
    const statusEl = document.getElementById("wallet-status");

    if (whitelist.includes(wallet)) {
      statusEl.innerText = "✅ Wallet Connected: " + wallet;
      document.getElementById("calculator").style.display = "block";
    } else {
      statusEl.innerText = "⛔ Wallet not authorized.";
    }
  } catch (err) {
    console.error(err);
  }
});

function calculateFIRE() {
  const expenses = parseFloat(document.getElementById("expenses").value);
  const rate = parseFloat(document.getElementById("rate").value) / 100;

  if (!expenses || !rate) {
    alert("Please enter valid numbers.");
    return;
  }

  const fireNumber = expenses / rate;
  document.getElementById("result").innerText =
    `🔥 Your FIRE number is $${fireNumber.toLocaleString()}`;
}
