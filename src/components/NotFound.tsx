import styles from '@/app/placeholder.module.css';

export function NotFound() {
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Este link no lleva a ninguna hoja.</h1>
      <p>Pedile a tu profe el link de nuevo. Si la hoja es nueva, puede que todavía no esté publicada.</p>
    </main>
  );
}
