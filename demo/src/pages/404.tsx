import {useEffect} from 'preact/compat';

export function NotFoundPage(props: any) {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.href = '/';
    }, 1e3);
    return () => {
      clearTimeout(timer);
    };
  }, []);
  return <div>Not found... You will be redirected</div>;
}
