// Smooth scroll untuk navigasi
document.querySelectorAll('.navbar a').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

// Fungsi untuk menyalin teks
function copyToClipboard(text) {
  // Buat elemen textarea untuk menyalin teks
  const textArea = document.createElement('textarea');
  textArea.value = text;
  document.body.appendChild(textArea);
  
  // Pilih dan salin teks
  textArea.select();
  document.execCommand('copy');
  
  // Hapus elemen textarea setelah menyalin
  document.body.removeChild(textArea);

  // Tampilkan pemberitahuan bahwa teks telah disalin
  alert('Teks telah disalin ke clipboard!');
}

// Menambahkan event listener ke tombol "Copy"
document.querySelectorAll('.copy-btn').forEach(button => {
  button.addEventListener('click', function() {
    const paymentText = this.getAttribute('data-payment-info');
    copyToClipboard(paymentText);
  });
});