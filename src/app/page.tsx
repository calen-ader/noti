import { HeroLogo } from '@/components/HeroLogo';
import { SignIn } from '@/components/SignIn';
import styles from './page.module.css';

export default function Home() {
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>
        <HeroLogo className={styles.logo} />
        <span className={styles.srOnly}>Noti</span>
      </h1>
      <p className={styles.line}>Las hojas de la muestra, siempre al día.</p>
      <SignIn />
    </main>
  );
}
