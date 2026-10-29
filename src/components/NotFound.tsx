import styles from '@/app/placeholder.module.css';

export function NotFound() {
  return (
    <div className={styles.wrap}>
      <main className={styles.page}>
        <h1 className={styles.title}>Este link no lleva a ningún proyecto.</h1>
        <p>Pedile el link de nuevo a quien te lo pasó. Puede que todavía no esté compartido.</p>
      </main>
    </div>
  );
}
