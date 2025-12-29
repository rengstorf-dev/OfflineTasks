document.addEventListener('DOMContentLoaded', () => {
    App.create()
        .then((app) => {
            window.app = app;
        })
        .catch((error) => {
            console.error('Failed to initialize app:', error);
            window.app = new App();
        });
});
