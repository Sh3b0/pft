from time import sleep

from seleniumbase import BaseCase


class UploadTest(BaseCase):

    def test_visible_upload(self):
        self.open("http://127.0.0.1:5000/#")

        file_path = "./test_files/pdf-test.pdf"
        self.choose_file("#file-input", file_path)

        code = self.get_text('#invite-link')

        self.open_new_window()
        self.open("http://127.0.0.1:5000/r/")
        self.type("#invite-link", code)
        self.click("#connect-button")
        sleep(3)

        self.assert_text("Downloaded", "#is-received1")
